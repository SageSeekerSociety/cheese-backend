import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { InvalidTokenError } from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TOTPService } from './totp.service';

describe('TOTPService', () => {
  let service: TOTPService;
  let prisma: PrismaService;
  let authService: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userBackupCode: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuthService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TOTPService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => ({
              appName: 'TestApp',
              backupCodesCount: 5,
              window: 1,
              encryptionKey: 'test-encryption-key-1234567890abc',
            })),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<TOTPService>(TOTPService);
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('should generate TOTP secret', async () => {
      const secret = await service.generateTOTPSecret();
      expect(secret).toHaveLength(16);
    });

    it('should generate valid TOTP URI', () => {
      const uri = service.generateTOTPUri('SECRET123', 'testuser');
      expect(uri).toContain('otpauth://totp/TestApp:testuser');
      expect(uri).toContain('secret=SECRET123');
    });
  });

  describe('2FA Lifecycle', () => {
    const mockUser = {
      id: 1,
      totpEnabled: false,
      totpSecret: null,
    };

    beforeEach(() => {
      mockUser.totpEnabled = false;
      mockUser.totpSecret = null;
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockImplementation(({ data }) => {
        Object.assign(mockUser, data);
        return mockUser;
      });
    });

    it('should enable 2FA with valid token', async () => {
      const testSecret = authenticator.generateSecret();
      const testToken = authenticator.generate(testSecret);

      const backupCodes = await service.enable2FA(1, testSecret, testToken);

      expect(backupCodes).toHaveLength(5);
      expect(mockPrisma.userBackupCode.create).toHaveBeenCalledTimes(5);
      expect(mockUser.totpEnabled).toBe(true);
      expect(mockUser.totpSecret).toBeDefined();
    });

    it('should throw when enabling 2FA with invalid token', async () => {
      const testSecret = authenticator.generateSecret();
      const invalidToken = '000000';

      await expect(
        service.enable2FA(1, testSecret, invalidToken),
      ).rejects.toThrowError('Invalid TOTP token');
    });

    it('should disable 2FA and clear backup codes', async () => {
      mockUser.totpEnabled = true;
      await service.disable2FA(1);

      expect(mockPrisma.userBackupCode.deleteMany).toHaveBeenCalled();
      expect(mockUser.totpEnabled).toBe(false);
      expect(mockUser.totpSecret).toBeNull();
    });
  });

  describe('Verification Process', () => {
    const encryptedSecret = 'encrypted-test-secret';
    const mockUser = {
      id: 1,
      totpEnabled: true,
      totpSecret: encryptedSecret,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'decryptSecret')
        .mockReturnValue('decrypted-secret');
      mockPrisma.userBackupCode.findMany.mockResolvedValue([]);
    });

    it('should verify valid TOTP code', async () => {
      const testToken = authenticator.generate('decrypted-secret');
      const result = await service.verify2FA(1, testToken);

      expect(result.isValid).toBe(true);
      expect(result.usedBackupCode).toBe(false);
    });

    it('should verify valid backup code', async () => {
      const testCode = 'backup123';
      const hashedCode = bcrypt.hashSync(testCode, 10);

      mockPrisma.userBackupCode.findMany.mockResolvedValue([
        {
          id: 1,
          codeHash: hashedCode,
          used: false,
        },
      ]);

      const result = await service.verify2FA(1, testCode);

      expect(result.isValid).toBe(true);
      expect(result.usedBackupCode).toBe(true);
      expect(mockPrisma.userBackupCode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { used: true },
      });
    });

    it('should return false for invalid code', async () => {
      const result = await service.verify2FA(1, 'invalid-code');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Backup Codes', () => {
    it('should generate new backup codes', async () => {
      const codes = await service.generateAndSaveBackupCodes(1);
      expect(codes).toHaveLength(5);
      expect(mockPrisma.userBackupCode.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.userBackupCode.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases', () => {
    it('should throw when enabling 2FA for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.enable2FA(999, 'secret', 'token')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw when disabling 2FA for non-enabled user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        totpEnabled: false,
      });
      await expect(service.disable2FA(1)).rejects.toThrow('2FA is not enabled');
    });
  });

  describe('Token Generation', () => {
    it('should generate sudo token with valid 2FA', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        totpEnabled: true,
        totpSecret: 'encrypted-secret',
      });
      jest
        .spyOn(service as any, 'decryptSecret')
        .mockReturnValue('decrypted-secret');
      authenticator.verify = jest.fn().mockReturnValue(true);

      const token = await service.verify2FAAndGenerateToken(1, 'valid-token');
      expect(authService.sign).toHaveBeenCalled();
    });

    it('should throw InvalidTokenError with invalid 2FA', async () => {
      jest
        .spyOn(service, 'verify2FA')
        .mockRejectedValueOnce(new InvalidTokenError());

      await expect(
        service.verify2FAAndGenerateToken(1, 'invalid-token'),
      ).rejects.toThrow(InvalidTokenError);
    });
  });
});

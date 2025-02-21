/*
 *  Description: This file provide additional tests to users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { Request } from 'express';
import { AppModule } from '../app.module';
import { InvalidCredentialsError } from '../auth/auth.error';
import { UsersService } from '../users/users.service';
import {
  SrpNotUpgradedError,
  SrpVerificationError,
  UserIdNotFoundError,
} from './users.error';

// Mock @simplewebauthn/server module
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(() =>
    Promise.resolve({
      challenge: 'fake-challenge',
      rp: { name: 'Test RP', id: 'localhost' },
      user: { name: 'testuser', id: Buffer.from('1') },
      pubKeyCredParams: [],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: [],
    }),
  ),
  verifyRegistrationResponse: jest.fn(() =>
    Promise.resolve({
      verified: true,
      registrationInfo: {
        credential: { id: 'cred-id', publicKey: 'fake-public-key', counter: 1 },
        credentialBackedUp: false,
        credentialDeviceType: 'singleDevice',
      },
    }),
  ),
  generateAuthenticationOptions: jest.fn(() =>
    Promise.resolve({
      challenge: 'fake-auth-challenge',
      timeout: 60000,
      rpId: 'localhost',
      allowCredentials: [],
      userVerification: 'preferred',
    }),
  ),
  verifyAuthenticationResponse: jest.fn(() =>
    Promise.resolve({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    }),
  ),
}));

describe('Users Module', () => {
  let app: TestingModule;
  let usersService: UsersService;
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    usersService = app.get<UsersService>(UsersService);
  });
  afterAll(async () => {
    await app.close();
  });

  it('should wait until user with id 1 exists', async () => {
    /* eslint-disable no-constant-condition */
    while (true) {
      try {
        await usersService.getUserDtoById(1, 1, '127.0.0.1', 'some user agent');
      } catch (e) {
        // wait one second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      break;
    }
  }, 120000); // 增加超时时间到 120 秒

  it('should return UserIdNotFoundError', async () => {
    // Mock findUnique 返回 null
    jest
      .spyOn(usersService['prismaService'].user, 'findUnique')
      .mockResolvedValue(null);

    await expect(usersService.addFollowRelationship(-1, 1)).rejects.toThrow(
      new UserIdNotFoundError(-1),
    );
    await expect(usersService.addFollowRelationship(1, -1)).rejects.toThrow(
      new UserIdNotFoundError(-1),
    );
  });

  it('should return UserIdNotFoundError for updateUserProfile', async () => {
    // Mock findUnique 返回 null
    jest
      .spyOn(usersService['prismaService'].user, 'findUnique')
      .mockResolvedValue(null);

    await expect(
      usersService.updateUserProfile(-1, 'nick', 'int', 1),
    ).rejects.toThrow(new UserIdNotFoundError(-1));
  });

  it('should return zero', async () => {
    expect(await usersService.isUserFollowUser(undefined, 1)).toBe(false);
    expect(await usersService.isUserFollowUser(1, undefined)).toBe(false);
  });

  describe('Password Reset and SRP', () => {
    beforeEach(() => {
      // Mock emailRuleService
      jest
        .spyOn(usersService['emailRuleService'], 'isEmailSuffixSupported')
        .mockResolvedValue(true);
    });

    it('should send reset password email successfully', async () => {
      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        } as any);

      // Mock email发送
      jest
        .spyOn(usersService['emailService'], 'sendPasswordResetEmail')
        .mockResolvedValueOnce();

      // Mock 日志记录
      jest
        .spyOn(usersService['prismaService'].userResetPasswordLog, 'create')
        .mockResolvedValueOnce({} as any);

      await expect(
        usersService.sendResetPasswordEmail(
          'test@example.com',
          '127.0.0.1',
          'test-agent',
        ),
      ).resolves.not.toThrow();
    });

    it('should verify and reset password with SRP credentials', async () => {
      // Mock token验证
      jest
        .spyOn(usersService['authService'], 'decode')
        .mockReturnValue({ authorization: { userId: 1 } } as any);
      jest
        .spyOn(usersService['authService'], 'audit')
        .mockResolvedValueOnce(undefined);

      // Mock user查询和更新
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
        } as any);

      const updateSpy = jest
        .spyOn(usersService['prismaService'].user, 'update')
        .mockResolvedValueOnce({} as any);

      // Mock 日志记录
      jest
        .spyOn(usersService['prismaService'].userResetPasswordLog, 'create')
        .mockResolvedValueOnce({} as any);

      await usersService.verifyAndResetPassword(
        'test-token',
        'new-srp-salt',
        'new-srp-verifier',
        '127.0.0.1',
        'test-agent',
      );

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          hashedPassword: '', // 清除旧的密码哈希
          srpSalt: 'new-srp-salt',
          srpVerifier: 'new-srp-verifier',
          srpUpgraded: true,
          lastPasswordChangedAt: expect.any(Date),
        },
      });
    });

    it('should handle expired reset token', async () => {
      // Mock token验证抛出 TokenExpiredError
      jest
        .spyOn(usersService['authService'], 'decode')
        .mockReturnValue({ authorization: { userId: 1 } } as any);
      jest
        .spyOn(usersService['authService'], 'audit')
        .mockRejectedValueOnce(new Error('Token expired'));

      // Mock 日志记录
      jest
        .spyOn(usersService['prismaService'].userResetPasswordLog, 'create')
        .mockResolvedValueOnce({} as any);

      await expect(
        usersService.verifyAndResetPassword(
          'expired-token',
          'new-srp-salt',
          'new-srp-verifier',
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow('Token expired');
    });

    it('should handle invalid reset token', async () => {
      // Mock token验证抛出 PermissionDeniedError
      jest
        .spyOn(usersService['authService'], 'decode')
        .mockReturnValue({ authorization: { userId: 1 } } as any);
      jest
        .spyOn(usersService['authService'], 'audit')
        .mockRejectedValueOnce(new Error('Permission denied'));

      // Mock 日志记录
      jest
        .spyOn(usersService['prismaService'].userResetPasswordLog, 'create')
        .mockResolvedValueOnce({} as any);

      await expect(
        usersService.verifyAndResetPassword(
          'invalid-token',
          'new-srp-salt',
          'new-srp-verifier',
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow('Permission denied');
    });

    it('should handle password change with SRP credentials', async () => {
      // Mock user查询和更新
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
        } as any);

      const updateSpy = jest
        .spyOn(usersService['prismaService'].user, 'update')
        .mockResolvedValueOnce({} as any);

      await usersService.changePassword(1, 'new-srp-salt', 'new-srp-verifier');

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          hashedPassword: '', // 清除旧的密码哈希
          srpSalt: 'new-srp-salt',
          srpVerifier: 'new-srp-verifier',
          srpUpgraded: true,
          lastPasswordChangedAt: expect.any(Date),
        },
      });
    });
  });

  describe('Sudo Mode Authentication', () => {
    it('should check sudo mode status correctly', async () => {
      const authorization = {
        userId: 1,
        permissions: [],
        sudoUntil: Date.now() + 1000, // 设置1秒后过期
      };
      expect(usersService['authService'].checkSudoMode(authorization)).toBe(
        true,
      );

      const expiredAuth = {
        userId: 1,
        permissions: [],
        sudoUntil: Date.now() - 1000, // 已过期
      };
      expect(usersService['authService'].checkSudoMode(expiredAuth)).toBe(
        false,
      );

      const noSudoAuth = {
        userId: 1,
        permissions: [],
      };
      expect(usersService['authService'].checkSudoMode(noSudoAuth)).toBe(false);
    });

    it('should verify sudo with password successfully', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);

      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          hashedPassword,
        } as any);

      // Mock token验证和签发
      jest
        .spyOn(usersService['authService'], 'verify')
        .mockReturnValue({ userId: 1 } as any);
      jest.spyOn(usersService['authService'], 'decode').mockReturnValue({
        authorization: { userId: 1 },
        validUntil: Date.now() + 3600000,
      } as any);
      jest
        .spyOn(usersService['authService'], 'issueSudoToken')
        .mockResolvedValueOnce('new-sudo-token');

      const result = await usersService.verifySudo(
        {} as Request,
        'old-token',
        'password',
        { password: 'correct-password' },
      );
      expect(result.accessToken).toBe('new-sudo-token');
    });

    it('should verify sudo with passkey successfully', async () => {
      // Mock passkey验证
      jest
        .spyOn(usersService, 'verifyPasskeyAuthentication')
        .mockResolvedValueOnce(true);

      // Mock token相关操作
      jest
        .spyOn(usersService['authService'], 'verify')
        .mockReturnValue({ userId: 1 } as any);
      jest.spyOn(usersService['authService'], 'decode').mockReturnValue({
        authorization: { userId: 1 },
        validUntil: Date.now() + 3600000,
      } as any);
      jest
        .spyOn(usersService['authService'], 'issueSudoToken')
        .mockResolvedValueOnce('new-sudo-token');

      const result = await usersService.verifySudo(
        {} as Request,
        'old-token',
        'passkey',
        { passkeyResponse: {} as any },
      );
      expect(result.accessToken).toBe('new-sudo-token');
    });

    it('should throw InvalidCredentialsError for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);

      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          hashedPassword,
        } as any);

      await expect(
        usersService.verifySudo({} as Request, 'old-token', 'password', {
          password: 'wrong-password',
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('Passkey Authentication', () => {
    beforeEach(() => {
      // Mock user查询和 profile
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValue({
          id: 1,
          username: 'testuser',
        } as any);

      jest
        .spyOn(usersService['prismaService'].userProfile, 'findUnique')
        .mockResolvedValue({
          userId: 1,
          nickname: 'Test User',
          intro: 'Test intro',
          avatarId: 1,
        } as any);
    });

    it('should generate passkey registration options and store challenge', async () => {
      const options = await usersService.generatePasskeyRegistrationOptions(1);
      expect(options.challenge).toBe('fake-challenge');
    });

    it('should verify passkey registration successfully', async () => {
      // 先为用户 1 设置 challenge
      await usersService['userChallengeRepository'].setChallenge(
        1,
        'fake-challenge',
        600,
      );
      const fakeRegistrationResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      await expect(
        usersService.verifyPasskeyRegistration(
          1,
          fakeRegistrationResponse as any,
        ),
      ).resolves.not.toThrow();
    });

    it('should throw ChallengeNotFoundError if challenge is missing', async () => {
      await expect(
        usersService.verifyPasskeyRegistration(1, {} as any),
      ).rejects.toThrow();
    });

    it('should generate passkey authentication options and set session challenge', async () => {
      // 创建一个伪造的请求对象，包含 session 属性
      const req: any = { session: {} };
      const authOptions =
        await usersService.generatePasskeyAuthenticationOptions(req);
      expect(authOptions.challenge).toBe('fake-auth-challenge');
      expect(req.session.passkeyChallenge).toBe('fake-auth-challenge');
    });

    it('should verify passkey authentication and update counter', async () => {
      const req: any = { session: { passkeyChallenge: 'fake-auth-challenge' } };
      // 模拟 prismaService.passkey.findFirst 返回存在的认证器记录
      const findFirstSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'findFirst')
        .mockResolvedValueOnce({
          id: 123,
          credentialId: 'cred-id',
          publicKey: Buffer.from('fake-public-key'),
          counter: 1,
          transports: JSON.stringify([]),
        } as any);
      // 监控 update 调用
      const updateSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'update')
        .mockResolvedValueOnce({} as any);
      const fakeAuthResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      const result = await usersService.verifyPasskeyAuthentication(
        req,
        fakeAuthResponse as any,
      );
      expect(result).toBe(true);
      expect(findFirstSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith({
        where: {
          id: 123,
        },
        data: {
          counter: 2,
        },
      });
    });

    it('should throw PasskeyNotFoundError if authenticator is not found', async () => {
      const req: any = { session: { passkeyChallenge: 'fake-auth-challenge' } };
      jest
        .spyOn(usersService['prismaService'].passkey, 'findFirst')
        .mockResolvedValueOnce(null);
      const fakeAuthResponse = {
        id: 'non-existent',
        rawId: 'raw-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      await expect(
        usersService.verifyPasskeyAuthentication(req, fakeAuthResponse as any),
      ).rejects.toThrow();
    });

    it('should get user passkeys', async () => {
      jest
        .spyOn(usersService['prismaService'].passkey, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 1,
            credentialId: 'test-id',
            publicKey: Buffer.from('key'),
            counter: 0,
            transports: JSON.stringify([]),
            deviceType: 'singleDevice',
            backedUp: false,
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      const passkeys = await usersService.getUserPasskeys(1);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0].credentialId).toBe('test-id');
    });

    it('should delete passkey for user', async () => {
      const deleteSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'deleteMany')
        .mockResolvedValueOnce({ count: 1 } as any);
      await usersService.deletePasskey(1, 'test-id');
      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          userId: 1,
          credentialId: 'test-id',
        },
      });
    });
  });

  describe('SRP Authentication', () => {
    it('should handle SRP initialization successfully', async () => {
      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          srpUpgraded: true,
          srpSalt: 'test-salt',
          srpVerifier: 'test-verifier',
        } as any);

      // Mock SRP服务
      jest
        .spyOn(usersService['srpService'], 'createServerSession')
        .mockResolvedValueOnce({
          serverEphemeral: {
            public: 'server-public',
            secret: 'server-secret',
          },
        });

      const result = await usersService.handleSrpInit(
        'testuser',
        'client-public',
      );

      expect(result.salt).toBe('test-salt');
      expect(result.serverPublicEphemeral).toBe('server-public');
      expect(result.serverSecretEphemeral).toBe('server-secret');
    });

    it('should handle SRP verification successfully', async () => {
      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          srpUpgraded: true,
          srpSalt: 'test-salt',
          srpVerifier: 'test-verifier',
        } as any);

      // Mock SRP验证
      jest
        .spyOn(usersService['srpService'], 'verifyClient')
        .mockResolvedValueOnce({
          success: true,
          serverProof: 'server-proof',
        });

      // Mock 登录日志创建
      jest
        .spyOn(usersService['prismaService'].userLoginLog, 'create')
        .mockResolvedValueOnce({} as any);

      // Mock getUserDtoById
      jest.spyOn(usersService, 'getUserDtoById').mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
      } as any);

      // Mock createSession
      jest
        .spyOn(usersService as any, 'createSession')
        .mockResolvedValueOnce('access-token');

      const result = await usersService.handleSrpVerify(
        'testuser',
        'client-public',
        'client-proof',
        'server-secret',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.serverProof).toBe('server-proof');
      expect(result.accessToken).toBe('access-token');
      expect(result.requires2FA).toBe(false);
    });

    it('should handle SRP verification with 2FA requirement', async () => {
      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          srpUpgraded: true,
          srpSalt: 'test-salt',
          srpVerifier: 'test-verifier',
          totpEnabled: true,
        } as any);

      // Mock SRP验证
      jest
        .spyOn(usersService['srpService'], 'verifyClient')
        .mockResolvedValueOnce({
          success: true,
          serverProof: 'server-proof',
        });

      // Mock shouldRequire2FA
      jest
        .spyOn(usersService as any, 'shouldRequire2FA')
        .mockResolvedValueOnce(true);

      // Mock generateTempToken
      jest
        .spyOn(usersService['totpService'], 'generateTempToken')
        .mockReturnValueOnce('temp-token');

      // Mock getUserDtoById
      jest.spyOn(usersService, 'getUserDtoById').mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
      } as any);

      const result = await usersService.handleSrpVerify(
        'testuser',
        'client-public',
        'client-proof',
        'server-secret',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.serverProof).toBe('server-proof');
      expect(result.requires2FA).toBe(true);
      expect(result.tempToken).toBe('temp-token');
      expect(result.accessToken).toBe('');
    });

    it('should throw SrpNotUpgradedError for non-upgraded users', async () => {
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          srpUpgraded: false,
        } as any);

      await expect(
        usersService.handleSrpInit('testuser', 'client-public'),
      ).rejects.toThrow(SrpNotUpgradedError);
    });

    it('should throw SrpVerificationError for failed verification', async () => {
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          srpUpgraded: true,
          srpSalt: 'test-salt',
          srpVerifier: 'test-verifier',
        } as any);

      jest
        .spyOn(usersService['srpService'], 'verifyClient')
        .mockResolvedValueOnce({
          success: false,
          serverProof: '',
        });

      await expect(
        usersService.handleSrpVerify(
          'testuser',
          'client-public',
          'client-proof',
          'server-secret',
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(SrpVerificationError);
    });
  });
});

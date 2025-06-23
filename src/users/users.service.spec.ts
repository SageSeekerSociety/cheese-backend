/*
 * Description: Unit tests for Users Service OAuth functionality
 *
 * Author(s):
 *     Claude Assistant
 */

import { RedisService } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AnswerService } from '../answer/answer.service';
import { AuthService } from '../auth/auth.service';
import { OAuthUserInfo } from '../auth/oauth/oauth.types';
import { SessionService } from '../auth/session.service';
import { AvatarsService } from '../avatars/avatars.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailRuleService } from '../email/email-rule.service';
import { EmailService } from '../email/email.service';
import { QuestionsService } from '../questions/questions.service';
import { RolePermissionService } from './role-permission.service';
import { SrpService } from './srp.service';
import { TOTPService } from './totp.service';
import { UserChallengeRepository } from './user-challenge.repository';
import { UsersPermissionService } from './users-permission.service';
import { UsersRegisterRequestService } from './users-register-request.service';
import { UsersService } from './users.service';

describe('UsersService - OAuth', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userOAuthConnection: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    userLoginLog: {
      create: jest.fn(),
    },
    userRegisterLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuthService = {
    generateRandomPassword: jest.fn().mockReturnValue('random-password'),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue('session-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'defaultIntro') {
        return 'This user has not set an introduction yet.';
      }
      return undefined;
    }),
  };

  const mockRedisService = {
    getOrThrow: jest.fn().mockReturnValue({
      publish: jest.fn(),
    }),
  };

  const mockEmailRuleService = {
    verifyEmailRule: jest.fn(),
  };

  const mockAnswerService = {
    // Add any methods that might be called in tests
  };

  const mockUsersPermissionService = {
    getAuthorizationForUser: jest.fn().mockResolvedValue({
      permissions: [],
      roles: [],
    }),
  };

  const mockAvatarsService = {
    getDefaultAvatarId: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EmailService, useValue: {} },
        { provide: EmailRuleService, useValue: mockEmailRuleService },
        { provide: AvatarsService, useValue: mockAvatarsService },
        { provide: UsersRegisterRequestService, useValue: {} },
        {
          provide: UsersPermissionService,
          useValue: mockUsersPermissionService,
        },
        { provide: RolePermissionService, useValue: {} },
        { provide: UserChallengeRepository, useValue: {} },
        { provide: TOTPService, useValue: {} },
        { provide: SrpService, useValue: {} },
        { provide: AnswerService, useValue: mockAnswerService },
        { provide: QuestionsService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loginWithOAuth', () => {
    const mockUserInfo: OAuthUserInfo = {
      id: '12345',
      email: 'test@ruc.edu.cn',
      name: 'Test User',
      username: 'testuser',
      preferredUsername: 'testuser',
    };

    const mockExistingUser = {
      id: 1,
      username: 'existing-user',
      email: 'test@ruc.edu.cn',
      deletedAt: null,
      userProfile: {
        id: 1,
        nickname: 'Existing User',
      },
    };

    const mockOAuthConnection = {
      id: 1,
      userId: 1,
      providerId: 'test',
      providerUserId: '12345',
      user: mockExistingUser,
    };

    beforeEach(() => {
      // Mock getUserDtoById method
      jest.spyOn(service, 'getUserDtoById').mockResolvedValue({
        id: 1,
        username: 'test-user',
        nickname: 'Test User',
        email: 'test@ruc.edu.cn',
      } as any);

      // Mock createSession method (it's private, so we need to mock the sessionService.createSession instead)
      jest
        .spyOn(mockSessionService, 'createSession')
        .mockResolvedValue('session-token');

      // Mock createDefaultProfileForUser method (private method, mock via prisma)
      jest
        .spyOn(service as any, 'createDefaultProfileForUser')
        .mockResolvedValue(undefined);
    });

    it('should login existing user with OAuth connection', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(
        mockOAuthConnection,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.update.mockResolvedValue({});

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(result[1]).toBe('session-token');
      expect(
        mockPrismaService.userOAuthConnection.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          providerId_providerUserId: {
            providerId: 'test',
            providerUserId: '12345',
          },
        },
        include: {
          user: {
            include: {
              userProfile: true,
            },
          },
        },
      });
      expect(mockPrismaService.userLoginLog.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });

    it('should create profile for user without profile', async () => {
      const connectionWithoutProfile = {
        ...mockOAuthConnection,
        user: {
          ...mockExistingUser,
          userProfile: null,
        },
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(
        connectionWithoutProfile,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.update.mockResolvedValue({});

      await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(service['createDefaultProfileForUser']).toHaveBeenCalledWith(1);
    });

    it('should bind OAuth to existing user by email', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockExistingUser)
        .mockResolvedValueOnce(mockExistingUser);
      mockPrismaService.userOAuthConnection.upsert.mockResolvedValue(
        mockOAuthConnection,
      );
      mockPrismaService.userLoginLog.create.mockResolvedValue({});

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@ruc.edu.cn' },
        include: { userProfile: true },
      });
      expect(mockPrismaService.userOAuthConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            providerId_providerUserId: {
              providerId: 'test',
              providerUserId: '12345',
            },
          },
          create: {
            providerId: 'test',
            providerUserId: '12345',
            userId: 1,
            rawProfile: mockUserInfo,
          },
          update: expect.objectContaining({
            rawProfile: mockUserInfo,
            updatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create new user when no existing connection or email match', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const newUser = {
        id: 2,
        username: 'testuser',
        email: 'test@ruc.edu.cn',
        deletedAt: null,
      };

      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: 'Test User',
      };

      const newOAuthConnection = {
        id: 2,
        userId: 2,
        providerId: 'test',
        providerUserId: '12345',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      // Mock the transaction operations
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue(
        newOAuthConnection,
      );
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);

      // Mock generateUniqueUsername method
      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser');

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          email: 'test@ruc.edu.cn',
          srpUpgraded: false,
        }),
      });
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 2,
          nickname: 'Test User',
          intro: 'This user has not set an introduction yet.',
          avatarId: 1,
        },
      });
      expect(mockPrismaService.userOAuthConnection.create).toHaveBeenCalledWith(
        {
          data: {
            userId: 2,
            providerId: 'test',
            providerUserId: '12345',
            rawProfile: mockUserInfo,
          },
        },
      );
    });

    it('should handle OAuth user without email', async () => {
      const userInfoWithoutEmail: OAuthUserInfo = {
        id: '12345',
        name: 'Test User',
        username: 'testuser',
        preferredUsername: 'testuser',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      const newUser = {
        id: 2,
        username: 'testuser',
        email: 'oauth-test-12345@placeholder.internal',
        deletedAt: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById
      mockPrismaService.user.findUnique.mockResolvedValue(newUser);

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser');

      await service.loginWithOAuth(
        'test',
        userInfoWithoutEmail,
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          email: 'oauth-test-12345@placeholder.internal',
          srpUpgraded: false,
        }),
      });
    });

    it('should handle deleted user gracefully', async () => {
      const deletedUser = {
        ...mockExistingUser,
        deletedAt: new Date(),
      };

      const connectionWithDeletedUser = {
        ...mockOAuthConnection,
        user: deletedUser,
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(
        connectionWithDeletedUser,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Should proceed to create new user
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = {
        id: 3,
        username: 'testuser2',
        email: 'test@ruc.edu.cn',
      };
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser2');

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should generate fallback nickname when OAuth name is missing', async () => {
      const userInfoWithoutName: OAuthUserInfo = {
        id: '12345',
        email: 'test@ruc.edu.cn',
        username: 'testuser',
        preferredUsername: 'testuser',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = { id: 2, username: 'testuser', email: 'test@ruc.edu.cn' };
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser');

      await service.loginWithOAuth(
        'test',
        userInfoWithoutName,
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 2,
          nickname: 'testuser', // Should fallback to username
          intro: 'This user has not set an introduction yet.',
          avatarId: 1,
        }),
      });
    });
  });
});

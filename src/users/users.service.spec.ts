/*
 * Description: Unit tests for Users Service OAuth functionality
 *
 * Author(s):
 *      HuanCheng65
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
import { PasswordNotMatchError } from './users.error';
import { UsersService } from './users.service';

describe('UsersService - OAuth', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userOAuthConnection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    userProfileQueryLog: {
      create: jest.fn(),
    },
    userFollowingRelationship: {
      count: jest.fn().mockResolvedValue(0),
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

  const mockRedis = {
    get: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    publish: jest.fn(),
  };

  const mockRedisService = {
    getOrThrow: jest.fn().mockReturnValue(mockRedis),
  };

  const mockEmailRuleService = {
    verifyEmailRule: jest.fn(),
  };

  const mockAnswerService = {
    getAnswerCount: jest.fn().mockResolvedValue(0),
  };

  const mockQuestionsService = {
    getQuestionCount: jest.fn().mockResolvedValue(0),
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
        { provide: QuestionsService, useValue: mockQuestionsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loginWithOAuth', () => {
    it('should handle existing OAuth connection', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '123',
        email: 'existing@example.com',
        name: 'Test User',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce({
        id: 1,
        providerId,
        providerUserId: userInfo.id,
        user: {
          id: 1,
          username: 'testuser',
          userProfile: { nickname: 'Test' },
        },
      });

      jest
        .spyOn(service as any, 'handleExistingOAuthConnection')
        .mockResolvedValueOnce([{ id: 1 }, 'session-token']);

      const result = await service.loginWithOAuth(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      // 检查返回结果是否为数组形式（成功登录）
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[1]).toBe('session-token');
      } else {
        fail('Expected array result for successful login');
      }
    });

    it('should handle SRP user with email conflict', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '456',
        email: 'existing@example.com',
        name: 'Test User',
      };

      // Mock no existing OAuth connection
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        null,
      );

      // Mock existing SRP user
      const existingUser = {
        id: 99,
        username: 'existing-user',
        email: 'existing@example.com',
        srpUpgraded: true,
        srpSalt: 'salt',
        srpVerifier: 'verifier',
        deletedAt: null,
        userProfile: { nickname: 'Existing' },
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(existingUser);

      // Mock SRP service
      jest.spyOn(service as any, 'initOAuthSrpVerification').mockResolvedValue({
        requiresVerification: true,
        verificationType: 'srp',
        email: 'existing@example.com',
        sessionId: 'oauth_srp_test_456_123_abc',
        salt: 'salt',
        serverPublicEphemeral: 'server-public',
      });

      const result = await service.loginWithOAuth(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('srp');
        expect(result.email).toBe('existing@example.com');
        expect(result.sessionId).toMatch(/^oauth_srp_/);
      } else {
        fail('Expected verification requirement for SRP user');
      }
    });

    it('should handle legacy user with email conflict', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '789',
        email: 'legacy@example.com',
        name: 'Legacy User',
      };

      // Mock no existing OAuth connection
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        null,
      );

      // Mock existing legacy user
      const existingUser = {
        id: 100,
        username: 'legacy-user',
        email: 'legacy@example.com',
        srpUpgraded: false,
        hashedPassword: 'hashed',
        deletedAt: null,
        userProfile: { nickname: 'Legacy' },
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(existingUser);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.loginWithOAuth(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('password');
        expect(result.email).toBe('legacy@example.com');
        expect(result.sessionId).toMatch(/^oauth_password_/);
      } else {
        fail('Expected verification requirement for legacy user');
      }
    });

    it('should create new user when no conflicts exist', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '123',
        email: 'new@example.com',
        name: 'New User',
      };

      // Mock no existing connections or users
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      jest
        .spyOn(service as any, 'createNewOAuthUser')
        .mockResolvedValueOnce([{ id: 2 }, 'new-session-token']);

      const result = await service.loginWithOAuth(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      // 检查返回结果是否为数组形式（成功登录）
      if (Array.isArray(result)) {
        expect(result[0]).toEqual({ id: 2 });
        expect(result[1]).toBe('new-session-token');
      } else {
        fail('Expected array result for new user creation');
      }
    });

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

      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[1]).toBe('session-token');
      } else {
        fail('Expected array result for successful login');
      }
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

    it('should create new user even when email matches existing user (security)', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      // 现在应该返回密码验证要求，而不是抛出错误

      const existingUser = {
        id: 99,
        username: 'existing-user',
        email: 'test@ruc.edu.cn',
        srpUpgraded: false, // 传统用户
        hashedPassword: 'hashedpassword',
        deletedAt: null,
        userProfile: {
          nickname: 'Existing User',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      // Mock the Redis setex for OAuth session
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      // 期待返回传统密码验证要求
      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('password');
        expect(result.email).toBe('test@ruc.edu.cn');
        expect(result.sessionId).toMatch(/^oauth_password_/);
      } else {
        fail('Expected password verification requirement');
      }

      // Should check for existing OAuth connection first
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

      // Should check for existing user by email
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@ruc.edu.cn' },
        include: { userProfile: true },
      });
    });

    it('should create new user when no existing connection or email match', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 没有匹配的用户

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

      // Mock user.findUnique for getOAuthUserDtoById (called multiple times in createNewOAuthUser)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // 第一次调用检查邮箱匹配
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

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

      // Mock for getOAuthUserDtoById calls
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        deletedAt: new Date(),
      });

      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        nickname: 'Test User',
      });

      // Mock session creation and logs
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValueOnce('session-token');

      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.update.mockResolvedValue({});

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[1]).toBe('session-token');
      } else {
        fail('Expected array result for deleted user OAuth connection');
      }
      expect(mockPrismaService.userLoginLog.create).toHaveBeenCalled();
      expect(mockPrismaService.userOAuthConnection.update).toHaveBeenCalled();
    });

    it('should generate fallback nickname when OAuth name is missing', async () => {
      const userInfoWithoutName: OAuthUserInfo = {
        id: '12345',
        email: 'unique-email@ruc.edu.cn', // 使用唯一邮箱避免冲突
        username: 'testuser',
        preferredUsername: 'testuser',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 没有邮箱冲突

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = {
        id: 2,
        username: 'testuser',
        email: 'unique-email@ruc.edu.cn',
      };
      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: 'testuser',
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById (called multiple times)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // 检查邮箱匹配时没有找到用户
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

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
          nickname: 'testuser', // Should fallback to username
          intro: 'This user has not set an introduction yet.',
          avatarId: 1,
        }),
      });
    });

    it('should handle database transaction errors during user creation', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Mock transaction to throw error
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database transaction failed'),
      );

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser');

      await expect(
        service.loginWithOAuth('test', mockUserInfo, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Database transaction failed');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle OAuth connection update errors', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(
        mockOAuthConnection,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});

      // Mock update to throw error
      mockPrismaService.userOAuthConnection.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.loginWithOAuth('test', mockUserInfo, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Update failed');
    });

    it('should handle missing OAuth user ID', async () => {
      const userInfoWithoutId: Omit<OAuthUserInfo, 'id'> & { id?: string } = {
        email: 'test@ruc.edu.cn',
        name: 'Test User',
        username: 'testuser',
        preferredUsername: 'testuser',
      };

      // Call with undefined id
      await expect(
        service.loginWithOAuth(
          'test',
          userInfoWithoutId as OAuthUserInfo,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow();
    });

    it('should handle very long OAuth user data', async () => {
      const longString = 'a'.repeat(1000);
      const userInfoWithLongData: OAuthUserInfo = {
        id: '12345',
        email: 'unique-long-email@ruc.edu.cn', // 使用唯一邮箱避免冲突
        name: longString,
        username: longString,
        preferredUsername: longString,
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 没有邮箱冲突

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = {
        id: 2,
        username: 'shortened-username', // Should be shortened
        email: 'unique-long-email@ruc.edu.cn',
      };

      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: longString.substring(0, 255),
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById (called multiple times)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // 检查邮箱匹配时没有找到用户
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('shortened-username');

      const result = await service.loginWithOAuth(
        'test',
        userInfoWithLongData,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nickname: longString.substring(0, 255), // Should be truncated if needed
        }),
      });
    });

    it('should handle OAuth provider with special characters in user data', async () => {
      const userInfoWithSpecialChars: OAuthUserInfo = {
        id: '12345<script>alert("xss")</script>',
        email: 'test+special-unique@ruc.edu.cn', // 使用唯一邮箱避免冲突
        name: 'Test User <>&"\'',
        username: 'test-user-123',
        preferredUsername: 'test_user_123',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 没有邮箱冲突

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = {
        id: 2,
        username: 'test-user-123',
        email: 'test+special-unique@ruc.edu.cn',
      };

      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: 'Test User <>&"\'',
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById (called multiple times)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // 检查邮箱匹配时没有找到用户
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('test-user-123');

      const result = await service.loginWithOAuth(
        'test',
        userInfoWithSpecialChars,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.userOAuthConnection.create).toHaveBeenCalledWith(
        {
          data: {
            userId: 2,
            providerId: 'test',
            providerUserId: '12345<script>alert("xss")</script>', // Should preserve original OAuth ID
            rawProfile: userInfoWithSpecialChars,
          },
        },
      );
    });

    it('should use preferredUsername when username is not available', async () => {
      const userInfoWithPreferredUsername: OAuthUserInfo = {
        id: '12345',
        email: 'preferred-unique@ruc.edu.cn', // 使用唯一邮箱避免冲突
        name: 'Test User',
        preferredUsername: 'preferred-user',
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 没有邮箱冲突

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = {
        id: 2,
        username: 'preferred-user',
        email: 'preferred-unique@ruc.edu.cn',
      };

      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: 'Test User',
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById (called multiple times)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // 检查邮箱匹配时没有找到用户
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('preferred-user');

      await service.loginWithOAuth(
        'test',
        userInfoWithPreferredUsername,
        '127.0.0.1',
        'test-agent',
      );

      expect(service['generateUniqueUsername']).toHaveBeenCalledWith(
        'preferred-user',
      );
    });
  });

  // 新增：测试OAuth账户选择流程
  describe('OAuth Account Choice Flow', () => {
    it('should require legacy password verification when email matches existing user', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      const existingUser = {
        id: 99,
        username: 'existing-user',
        email: 'test@ruc.edu.cn',
        srpUpgraded: false, // 传统用户
        hashedPassword: 'hashedpassword',
        deletedAt: null,
        userProfile: {
          nickname: 'Existing User',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockRedis.setex.mockResolvedValue('OK');

      const userInfoWithEmail: OAuthUserInfo = {
        id: '12345',
        email: 'test@ruc.edu.cn',
        name: 'OAuth User',
        username: 'oauthuser',
      };

      const result = await service.loginWithOAuth(
        'github',
        userInfoWithEmail,
        '127.0.0.1',
        'test-agent',
      );

      // 期待返回传统密码验证要求
      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('password');
        expect(result.email).toBe('test@ruc.edu.cn');
        expect(result.sessionId).toMatch(/^oauth_password_/);
      } else {
        fail('Expected legacy password verification requirement');
      }

      // Should check for existing OAuth connection first
      expect(
        mockPrismaService.userOAuthConnection.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          providerId_providerUserId: {
            providerId: 'github',
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

      // Should check for existing user by email
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@ruc.edu.cn' },
        include: { userProfile: true },
      });
    });

    it('should require SRP verification for SRP-enabled users', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      const srpUser = {
        id: 99,
        username: 'srp-user',
        email: 'srp@ruc.edu.cn',
        srpUpgraded: true, // SRP用户
        srpSalt: 'salt',
        srpVerifier: 'verifier',
        deletedAt: null,
        userProfile: {
          nickname: 'SRP User',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(srpUser);
      mockRedis.setex.mockResolvedValue('OK');

      // Mock initOAuthSrpVerification method
      jest.spyOn(service as any, 'initOAuthSrpVerification').mockResolvedValue({
        requiresVerification: true,
        verificationType: 'srp',
        email: 'srp@ruc.edu.cn',
        sessionId: 'oauth_srp_test_67890_123456_abc123',
        salt: 'salt',
        serverPublicEphemeral: 'server-public',
      });

      const userInfoWithEmail: OAuthUserInfo = {
        id: '67890',
        email: 'srp@ruc.edu.cn',
        name: 'SRP User',
        username: 'srpuser',
      };

      const result = await service.loginWithOAuth(
        'github',
        userInfoWithEmail,
        '127.0.0.1',
        'test-agent',
      );

      // 期待返回SRP验证要求
      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('srp');
        expect(result.email).toBe('srp@ruc.edu.cn');
        expect(result.sessionId).toMatch(/^oauth_srp_/);
      } else {
        fail('Expected SRP verification requirement');
      }
    });

    it('should not require verification when existing user is deleted', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      const deletedUser = {
        id: 99,
        username: 'deleted-user',
        email: 'test@ruc.edu.cn',
        deletedAt: new Date(), // User is deleted
        userProfile: {
          nickname: 'Deleted User',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(deletedUser);

      // Should proceed to create new user since existing user is deleted
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });

      const newUser = { id: 2, username: 'testuser', email: 'test@ruc.edu.cn' };
      const newUserProfile = {
        id: 2,
        userId: 2,
        nickname: 'OAuth User',
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue(newUserProfile);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({});
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userRegisterLog.create.mockResolvedValue({});

      // Mock user.findUnique for getOAuthUserDtoById
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(deletedUser) // 第一次调用检查邮箱匹配，找到已删除用户
        .mockResolvedValue(newUser); // 后续调用返回新用户

      // Mock userProfile.findUnique for getOAuthUserDtoById
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        newUserProfile,
      );

      jest
        .spyOn(service, 'generateUniqueUsername' as any)
        .mockResolvedValue('testuser');

      const userInfoWithEmail: OAuthUserInfo = {
        id: '12345',
        email: 'test@ruc.edu.cn',
        name: 'OAuth User',
        username: 'oauthuser',
      };

      const result = await service.loginWithOAuth(
        'github',
        userInfoWithEmail,
        '127.0.0.1',
        'test-agent',
      );

      // 期待返回数组形式（成功创建新用户）
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
      } else {
        fail('Expected array result for new user creation');
      }
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('completeOAuthVerification', () => {
    it('should verify password and upgrade user to SRP', async () => {
      const sessionId = 'oauth_password_session123';
      const password = 'correctpassword';
      const sessionData = {
        type: 'password',
        providerId: 'test',
        userInfo: { id: '123', email: 'test@example.com' },
        existingUserId: 1,
        existingUsername: 'testuser',
      };

      // Mock Redis session data
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValueOnce(1);

      // Mock user data
      const userData = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpassword',
        srpSalt: null,
        srpVerifier: null,
        srpUpgraded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        deletedAt: null,
        totpSecret: null,
        totpEnabled: false,
        totpAlwaysRequired: false,
      };
      jest
        .spyOn(service, 'findUserRecordOrThrow')
        .mockResolvedValueOnce(userData);

      // Mock authentication method
      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValueOnce({ verified: true, wasUpgraded: true });

      // Mock OAuth connection checks
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        null,
      );
      mockPrismaService.userOAuthConnection.create.mockResolvedValueOnce({});
      mockPrismaService.userLoginLog.create.mockResolvedValueOnce({});

      // Mock user DTO and session creation
      jest
        .spyOn(service, 'getOAuthUserDtoById')
        .mockResolvedValueOnce({ id: 1 } as any);
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValueOnce('session-token');

      const result = await service.completeOAuthVerification(
        sessionId,
        { password },
        'ip',
        'agent',
      );

      expect(result[0]).toEqual({ id: 1 });
      expect(result[1]).toBe('session-token');
      expect(mockRedis.del).toHaveBeenCalledWith(`oauth_session:${sessionId}`);
    });

    it('should handle wrong password', async () => {
      const sessionId = 'oauth_password_session123';
      const password = 'wrongpassword';
      const sessionData = {
        type: 'password',
        providerId: 'test',
        userInfo: { id: '123', email: 'test@example.com' },
        existingUserId: 1,
        existingUsername: 'testuser',
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      const userData = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpassword',
        srpSalt: null,
        srpVerifier: null,
        srpUpgraded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        deletedAt: null,
        totpSecret: null,
        totpEnabled: false,
        totpAlwaysRequired: false,
      };
      jest
        .spyOn(service, 'findUserRecordOrThrow')
        .mockResolvedValueOnce(userData);

      // Mock authentication failure
      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValueOnce({ verified: false, wasUpgraded: false });

      await expect(
        service.completeOAuthVerification(
          sessionId,
          { password },
          'ip',
          'agent',
        ),
      ).rejects.toThrow(PasswordNotMatchError);
    });

    it('should handle expired session', async () => {
      const sessionId = 'oauth_session123';
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(
        service.completeOAuthVerification(
          sessionId,
          { password: 'password' },
          'ip',
          'agent',
        ),
      ).rejects.toThrow('OAuth session not found or expired');
    });
  });

  // OAuth 绑定功能测试
  describe('OAuth Binding', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      deletedAt: null,
    };

    const mockUserInfo: OAuthUserInfo = {
      id: 'oauth123',
      email: 'oauth@example.com',
      name: 'OAuth User',
      username: 'oauthuser',
      preferredUsername: 'oauthuser',
    };

    describe('initOAuthBinding', () => {
      beforeEach(() => {
        mockRedis.setex.mockResolvedValue('OK');
        jest
          .spyOn(service as any, 'findUserRecordOrThrow')
          .mockResolvedValue(mockUser);
      });

      it('should initialize OAuth binding successfully', async () => {
        const result = await service.initOAuthBinding(
          1,
          'github',
          'test-state',
        );

        expect(result.bindingSessionId).toMatch(/^oauth_binding_github_1_\d+_/);
        expect(mockRedis.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^oauth_binding_session:/),
          15 * 60,
          expect.stringContaining('"type":"binding"'),
        );
      });

      it('should throw error if user not found', async () => {
        jest
          .spyOn(service as any, 'findUserRecordOrThrow')
          .mockRejectedValueOnce(new Error('User not found'));

        await expect(service.initOAuthBinding(999, 'github')).rejects.toThrow(
          'User not found',
        );
      });
    });

    describe('handleOAuthBindingCallback', () => {
      const bindingSessionId = 'oauth_binding_github_1_123_abc';
      const sessionData = {
        type: 'binding',
        userId: 1,
        providerId: 'github',
        originalState: 'test-state',
        createdAt: new Date().toISOString(),
      };

      beforeEach(() => {
        mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
        mockRedis.del.mockResolvedValue(1);
      });

      it('should bind OAuth account successfully', async () => {
        // Mock no existing connection
        mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
          null,
        );
        mockPrismaService.userOAuthConnection.findFirst.mockResolvedValueOnce(
          null,
        );
        mockPrismaService.userOAuthConnection.create.mockResolvedValue({
          id: 1,
          userId: 1,
          providerId: 'github',
          providerUserId: 'oauth123',
        });

        const result = await service.handleOAuthBindingCallback(
          'github',
          mockUserInfo,
          bindingSessionId,
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('OAuth account linked successfully');
        expect(
          mockPrismaService.userOAuthConnection.create,
        ).toHaveBeenCalledWith({
          data: {
            userId: 1,
            providerId: 'github',
            providerUserId: 'oauth123',
            rawProfile: mockUserInfo,
          },
        });
        expect(mockRedis.del).toHaveBeenCalledWith(
          `oauth_binding_session:${bindingSessionId}`,
        );
      });

      it('should fail if OAuth account already bound to same user', async () => {
        mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce({
          id: 1,
          userId: 1,
          providerId: 'github',
          providerUserId: 'oauth123',
        });

        const result = await service.handleOAuthBindingCallback(
          'github',
          mockUserInfo,
          bindingSessionId,
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
          'This OAuth account is already linked to your account',
        );
        expect(mockRedis.del).toHaveBeenCalled();
      });

      it('should fail if OAuth account already bound to another user', async () => {
        mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce({
          id: 1,
          userId: 999, // Different user
          providerId: 'github',
          providerUserId: 'oauth123',
        });

        const result = await service.handleOAuthBindingCallback(
          'github',
          mockUserInfo,
          bindingSessionId,
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
          'This OAuth account is already linked to another user',
        );
        expect(mockRedis.del).toHaveBeenCalled();
      });

      it('should fail if user already has another account from same provider', async () => {
        // No existing connection for this OAuth account
        mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
          null,
        );
        // But user has another GitHub account
        mockPrismaService.userOAuthConnection.findFirst.mockResolvedValueOnce({
          id: 2,
          userId: 1,
          providerId: 'github',
          providerUserId: 'different-oauth-id',
        });

        const result = await service.handleOAuthBindingCallback(
          'github',
          mockUserInfo,
          bindingSessionId,
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
          'You have already linked another github account. Please unbind it first.',
        );
        expect(mockRedis.del).toHaveBeenCalled();
      });

      it('should throw error if binding session not found', async () => {
        mockRedis.get.mockResolvedValue(null);

        await expect(
          service.handleOAuthBindingCallback(
            'github',
            mockUserInfo,
            bindingSessionId,
          ),
        ).rejects.toThrow('Binding session not found or expired');
      });

      it('should throw error if session type is invalid', async () => {
        const invalidSession = { ...sessionData, type: 'login' };
        mockRedis.get.mockResolvedValue(JSON.stringify(invalidSession));

        await expect(
          service.handleOAuthBindingCallback(
            'github',
            mockUserInfo,
            bindingSessionId,
          ),
        ).rejects.toThrow('Invalid binding session');
      });

      it('should throw error if provider mismatch', async () => {
        const mismatchSession = { ...sessionData, providerId: 'google' };
        mockRedis.get.mockResolvedValue(JSON.stringify(mismatchSession));

        await expect(
          service.handleOAuthBindingCallback(
            'github',
            mockUserInfo,
            bindingSessionId,
          ),
        ).rejects.toThrow('Invalid binding session');
      });
    });

    describe('getUserOAuthConnections', () => {
      it('should return user OAuth connections', async () => {
        const mockConnections = [
          {
            id: 1,
            providerId: 'github',
            providerUserId: 'github123',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
          },
          {
            id: 2,
            providerId: 'google',
            providerUserId: 'google456',
            createdAt: new Date('2024-01-02T00:00:00.000Z'),
          },
        ];

        mockPrismaService.userOAuthConnection.findMany.mockResolvedValue(
          mockConnections,
        );

        const result = await service.getUserOAuthConnections(1);

        expect(result).toEqual([
          {
            id: 1,
            providerId: 'github',
            providerName: 'GitHub',
            providerUserId: 'github123',
            connectedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            providerId: 'google',
            providerName: 'Google',
            providerUserId: 'google456',
            connectedAt: '2024-01-02T00:00:00.000Z',
          },
        ]);

        expect(
          mockPrismaService.userOAuthConnection.findMany,
        ).toHaveBeenCalledWith({
          where: { userId: 1 },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should handle unknown provider names', async () => {
        const mockConnections = [
          {
            id: 1,
            providerId: 'unknown',
            providerUserId: 'unknown123',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
          },
        ];

        mockPrismaService.userOAuthConnection.findMany.mockResolvedValue(
          mockConnections,
        );

        const result = await service.getUserOAuthConnections(1);

        expect(result[0].providerName).toBe('unknown');
      });
    });

    describe('unbindOAuth', () => {
      const mockConnection = {
        id: 1,
        userId: 1,
        providerId: 'github',
        providerUserId: 'github123',
      };

      beforeEach(() => {
        mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue(
          mockConnection,
        );
        mockPrismaService.userOAuthConnection.count.mockResolvedValue(2);
        mockPrismaService.user.findUnique.mockResolvedValue({
          hashedPassword: 'hashed-password',
          srpUpgraded: true,
        });
        mockPrismaService.userOAuthConnection.delete.mockResolvedValue(
          mockConnection,
        );
      });

      it('should unbind OAuth connection successfully', async () => {
        const result = await service.unbindOAuth(1, 1);

        expect(result.success).toBe(true);
        expect(result.unboundConnectionId).toBe(1);
        expect(
          mockPrismaService.userOAuthConnection.delete,
        ).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it('should throw error if connection not found', async () => {
        mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue(null);

        await expect(service.unbindOAuth(1, 999)).rejects.toThrow(
          'OAuth connection not found or does not belong to this user',
        );
      });

      it('should throw error if connection belongs to different user', async () => {
        const differentUserConnection = { ...mockConnection, userId: 999 };
        mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue(null);

        await expect(service.unbindOAuth(1, 1)).rejects.toThrow(
          'OAuth connection not found or does not belong to this user',
        );
      });

      it('should throw error if it is the only authentication method', async () => {
        // Only one OAuth connection
        mockPrismaService.userOAuthConnection.count.mockResolvedValue(1);
        // No password set
        mockPrismaService.user.findUnique.mockResolvedValue({
          hashedPassword: null,
          srpUpgraded: false,
        });

        await expect(service.unbindOAuth(1, 1)).rejects.toThrow(
          'Cannot unbind the only authentication method. Please set a password first.',
        );
      });

      it('should allow unbinding if user has password', async () => {
        // Only one OAuth connection but user has password
        mockPrismaService.userOAuthConnection.count.mockResolvedValue(1);
        mockPrismaService.user.findUnique.mockResolvedValue({
          hashedPassword: 'hashed-password',
          srpUpgraded: true,
        });

        const result = await service.unbindOAuth(1, 1);

        expect(result.success).toBe(true);
        expect(result.unboundConnectionId).toBe(1);
      });

      it('should allow unbinding if user has multiple OAuth connections', async () => {
        // Multiple OAuth connections
        mockPrismaService.userOAuthConnection.count.mockResolvedValue(2);
        // No password but has other OAuth connections
        mockPrismaService.user.findUnique.mockResolvedValue({
          hashedPassword: null,
          srpUpgraded: false,
        });

        const result = await service.unbindOAuth(1, 1);

        expect(result.success).toBe(true);
        expect(result.unboundConnectionId).toBe(1);
      });
    });
  });
});

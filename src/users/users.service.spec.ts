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
import { UserIdNotFoundError, UsernameNotFoundError } from './users.error';
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
      count: jest.fn(),
      update: jest.fn(),
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
    passkey: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
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
      if (key === 'webauthn.rpName') {
        return 'Test RP';
      }
      if (key === 'webauthn.rpID') {
        return 'localhost';
      }
      if (key === 'webauthn.origin') {
        return 'http://localhost:7777';
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
    isEmailSuffixSupported: jest.fn().mockResolvedValue(true),
    emailSuffixRule: 'Only @ruc.edu.cn emails are allowed',
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

  const mockUserChallengeRepository = {
    setChallenge: jest.fn(),
    getChallenge: jest.fn(),
    deleteChallenge: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockTOTPService = {
    generateSecret: jest.fn(),
    verify: jest.fn(),
  };

  const mockSrpService = {
    generateSalt: jest.fn(),
    computeVerifier: jest.fn(),
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
        { provide: EmailService, useValue: mockEmailService },
        { provide: EmailRuleService, useValue: mockEmailRuleService },
        { provide: AvatarsService, useValue: mockAvatarsService },
        { provide: UsersRegisterRequestService, useValue: {} },
        {
          provide: UsersPermissionService,
          useValue: mockUsersPermissionService,
        },
        { provide: RolePermissionService, useValue: {} },
        {
          provide: UserChallengeRepository,
          useValue: mockUserChallengeRepository,
        },
        { provide: TOTPService, useValue: mockTOTPService },
        { provide: SrpService, useValue: mockSrpService },
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

  describe('Validation Methods', () => {
    describe('isEmailRegistered', () => {
      it('should return true when email is registered', async () => {
        mockPrismaService.user.count.mockResolvedValue(1);

        const result = await service.isEmailRegistered('test@example.com');

        expect(result).toBe(true);
        expect(mockPrismaService.user.count).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
      });

      it('should return false when email is not registered', async () => {
        mockPrismaService.user.count.mockResolvedValue(0);

        const result = await service.isEmailRegistered('test@example.com');

        expect(result).toBe(false);
      });
    });

    describe('isUsernameRegistered', () => {
      it('should return true when username is registered', async () => {
        mockPrismaService.user.count.mockResolvedValue(1);

        const result = await service.isUsernameRegistered('testuser');

        expect(result).toBe(true);
        expect(mockPrismaService.user.count).toHaveBeenCalledWith({
          where: { username: 'testuser' },
        });
      });

      it('should return false when username is not registered', async () => {
        mockPrismaService.user.count.mockResolvedValue(0);

        const result = await service.isUsernameRegistered('testuser');

        expect(result).toBe(false);
      });
    });

    describe('findUserRecordOrThrow', () => {
      it('should return user when found', async () => {
        const mockUser = { id: 1, username: 'testuser' };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await service.findUserRecordOrThrow(1);

        expect(result).toBe(mockUser);
      });

      it('should throw UserIdNotFoundError when user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.findUserRecordOrThrow(999)).rejects.toThrow(
          new UserIdNotFoundError(999),
        );
      });
    });

    describe('findUserRecordByUsernameOrThrow', () => {
      it('should return user when found', async () => {
        const mockUser = { id: 1, username: 'testuser' };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result =
          await service.findUserRecordByUsernameOrThrow('testuser');

        expect(result).toBe(mockUser);
      });

      it('should throw UsernameNotFoundError when user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.findUserRecordByUsernameOrThrow('nonexistent'),
        ).rejects.toThrow(new UsernameNotFoundError('nonexistent'));
      });
    });

    describe('Getter methods', () => {
      it('should return email suffix rule', () => {
        const rule = service.emailSuffixRule;
        expect(rule).toBe('Only @ruc.edu.cn emails are allowed');
      });

      it('should return username rule', () => {
        const rule = service.usernameRule;
        expect(rule).toBe(
          'Username must be 4-32 characters long and can only contain letters, numbers, underscores and hyphens.',
        );
      });

      it('should return nickname rule', () => {
        const rule = service.nicknameRule;
        expect(rule).toBe(
          'Nickname must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.',
        );
      });

      it('should return password rule', () => {
        const rule = service.passwordRule;
        expect(rule).toBe(
          'Password must be at least 8 characters long and must contain at least one letter, one special character and one number.',
        );
      });

      it('should return default intro', () => {
        const intro = service.defaultIntro;
        expect(intro).toBe('This user has not set an introduction yet.');
      });
    });
  });

  describe('Passkey functionality', () => {
    describe('generatePasskeyRegistrationOptions', () => {
      it('should generate passkey registration options', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          hashedPassword: null,
          srpSalt: 'salt',
          srpVerifier: 'verifier',
          srpUpgraded: true,
          totpEnabled: false,
          totpSecret: null,
          totpAlwaysRequired: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          lastPasswordChangedAt: new Date(),
        };
        const mockProfile = {
          id: 1,
          userId: 1,
          nickname: 'Test User',
          avatarId: 1,
          intro: 'Test intro',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        const mockPasskeys = [
          { credentialId: 'existing-cred-id', transports: '["usb"]' },
        ];

        jest
          .spyOn(service, 'findUserRecordAndProfileRecordOrThrow')
          .mockResolvedValue([mockUser, mockProfile]);
        mockPrismaService.passkey.findMany.mockResolvedValue(mockPasskeys);
        mockUserChallengeRepository.setChallenge.mockResolvedValue(undefined);

        // Mock the WebAuthn server functions
        const mockOptions = {
          challenge: 'test-challenge',
          rp: { name: 'Test RP', id: 'localhost' },
        };

        // Mock the generateRegistrationOptions function
        jest.doMock('@simplewebauthn/server', () => ({
          generateRegistrationOptions: jest.fn().mockResolvedValue(mockOptions),
        }));

        const options = await service.generatePasskeyRegistrationOptions(1);

        expect(
          service.findUserRecordAndProfileRecordOrThrow,
        ).toHaveBeenCalledWith(1);
        expect(mockPrismaService.passkey.findMany).toHaveBeenCalledWith({
          where: { userId: 1 },
        });
        // Should set challenge for user
        expect(mockUserChallengeRepository.setChallenge).toHaveBeenCalledWith(
          1,
          expect.any(String),
          600,
        );
      });
    });

    describe('getUserPasskeys', () => {
      it('should return user passkeys', async () => {
        const mockPasskeys = [
          { id: 1, credentialId: 'cred-1', userId: 1 },
          { id: 2, credentialId: 'cred-2', userId: 1 },
        ];
        mockPrismaService.passkey.findMany.mockResolvedValue(mockPasskeys);

        const result = await service.getUserPasskeys(1);

        expect(result).toBe(mockPasskeys);
        expect(mockPrismaService.passkey.findMany).toHaveBeenCalledWith({
          where: { userId: 1 },
        });
      });
    });

    describe('deletePasskey', () => {
      it('should delete passkey', async () => {
        mockPrismaService.passkey.deleteMany.mockResolvedValue({ count: 1 });

        await service.deletePasskey(1, 'cred-id');

        expect(mockPrismaService.passkey.deleteMany).toHaveBeenCalledWith({
          where: {
            userId: 1,
            credentialId: 'cred-id',
          },
        });
      });
    });
  });

  describe('User existence checks', () => {
    describe('isUserExists', () => {
      it('should return true when user exists', async () => {
        mockPrismaService.user.count.mockResolvedValue(1);

        const result = await service.isUserExists(1);

        expect(result).toBe(true);
        expect(mockPrismaService.user.count).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it('should return false when user does not exist', async () => {
        mockPrismaService.user.count.mockResolvedValue(0);

        const result = await service.isUserExists(999);

        expect(result).toBe(false);
      });
    });
  });

  describe('Follow relationship counts', () => {
    describe('getFollowingCount', () => {
      it('should return following count', async () => {
        mockPrismaService.userFollowingRelationship.count.mockResolvedValue(5);

        const result = await service.getFollowingCount(1);

        expect(result).toBe(5);
        expect(
          mockPrismaService.userFollowingRelationship.count,
        ).toHaveBeenCalledWith({
          where: { followerId: 1 },
        });
      });
    });

    describe('getFollowedCount', () => {
      it('should return followed count', async () => {
        mockPrismaService.userFollowingRelationship.count.mockResolvedValue(10);

        const result = await service.getFollowedCount(1);

        expect(result).toBe(10);
        expect(
          mockPrismaService.userFollowingRelationship.count,
        ).toHaveBeenCalledWith({
          where: { followeeId: 1 },
        });
      });
    });

    describe('isUserFollowUser', () => {
      it('should return true when user follows another user', async () => {
        mockPrismaService.userFollowingRelationship.count.mockResolvedValue(1);

        const result = await service.isUserFollowUser(1, 2);

        expect(result).toBe(true);
        expect(
          mockPrismaService.userFollowingRelationship.count,
        ).toHaveBeenCalledWith({
          where: {
            followerId: 1,
            followeeId: 2,
          },
        });
      });

      it('should return false when user does not follow another user', async () => {
        mockPrismaService.userFollowingRelationship.count.mockResolvedValue(0);

        const result = await service.isUserFollowUser(1, 2);

        expect(result).toBe(false);
      });

      it('should return false when either user ID is undefined', async () => {
        const result1 = await service.isUserFollowUser(undefined, 2);
        const result2 = await service.isUserFollowUser(1, undefined);

        expect(result1).toBe(false);
        expect(result2).toBe(false);
        expect(
          mockPrismaService.userFollowingRelationship.count,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('Session creation', () => {
    describe('createSessionForNewUser', () => {
      it('should create session for new user', async () => {
        mockSessionService.createSession.mockResolvedValue('new-session-token');

        const result = await service.createSessionForNewUser(1);

        expect(result).toBe('new-session-token');
        expect(mockSessionService.createSession).toHaveBeenCalledWith(1, {
          permissions: [],
          roles: [],
        });
      });
    });
  });

  describe('Password change', () => {
    describe('changePassword', () => {
      it('should change user password with SRP credentials', async () => {
        const mockUser = { id: 1, username: 'testuser' };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.user.update.mockResolvedValue(mockUser);

        await service.changePassword(1, 'new-salt', 'new-verifier');

        expect(mockPrismaService.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            srpSalt: 'new-salt',
            srpVerifier: 'new-verifier',
            srpUpgraded: true,
            hashedPassword: '',
            lastPasswordChangedAt: expect.any(Date),
          },
        });
      });

      it('should throw UserIdNotFoundError when user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.changePassword(999, 'salt', 'verifier'),
        ).rejects.toThrow(new UserIdNotFoundError(999));
      });
    });
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

      // Check if the result is an array (successful login)
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

      // Check if the result is an array (successful login)
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
      // Should now return password verification requirement instead of throwing error

      const existingUser = {
        id: 99,
        username: 'existing-user',
        email: 'test@ruc.edu.cn',
        srpUpgraded: false, // Legacy user
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

      // Expect legacy password verification requirement
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
        where: {
          email: 'test@ruc.edu.cn',
        },
        include: {
          userProfile: true,
        },
      });
    });

    it('should check for existing user by email without userProfile', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      const existingUser = {
        id: 99,
        username: 'existing-user',
        email: 'test@ruc.edu.cn',
        srpUpgraded: false,
        hashedPassword: 'hashedpassword',
        deletedAt: null,
        userProfile: null, // No profile
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.loginWithOAuth(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      // Still expect password verification requirement
      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('password');
      } else {
        fail('Expected password verification requirement');
      }
    });
  });
});

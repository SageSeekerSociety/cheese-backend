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

// Mock @simplewebauthn/server at the top level to ensure proper hoisting
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

// Mock bcrypt for testing
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

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
      findMany: jest.fn(),
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
      createMany: jest.fn(),
    },
    userFollowingRelationship: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    answer: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    question: {
      groupBy: jest.fn().mockResolvedValue([]),
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
    sign: jest.fn(),
    decode: jest.fn(),
    audit: jest.fn(),
    verify: jest.fn(),
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
    generateTempToken: jest.fn(),
    verify2FA: jest.fn(),
  };

  const mockSrpService = {
    generateSalt: jest.fn(),
    computeVerifier: jest.fn(),
    createServerSession: jest.fn().mockResolvedValue({
      serverEphemeral: {
        public: 'server-public-key',
        secret: 'server-secret-key',
      },
    }),
    verifyClient: jest.fn(),
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

        // Configure the mocked function to return the desired options
        const { generateRegistrationOptions } = jest.requireMock(
          '@simplewebauthn/server',
        );
        generateRegistrationOptions.mockResolvedValueOnce(mockOptions);

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

  describe('initiateOAuthFlow', () => {
    it('should handle existing OAuth connection', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const existingConnection = {
        id: 1,
        userId: 1,
        user: {
          id: 1,
          username: 'existing-user',
          email: 'test@example.com',
          userProfile: {
            nickname: 'Existing User',
          },
        },
      };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        existingConnection,
      );
      mockPrismaService.userLoginLog.create.mockResolvedValueOnce({});
      mockPrismaService.userOAuthConnection.update.mockResolvedValueOnce({});

      // Mock getOAuthUserDtoById
      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValueOnce({
        id: 1,
        username: 'existing-user',
        nickname: 'Existing User',
        email: 'test@example.com',
        avatarId: 1,
        intro: 'Test intro',
        follow_count: 0,
        fans_count: 0,
        question_count: 0,
        answer_count: 0,
        is_follow: false,
      });

      // Mock createSession
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValueOnce('new-session-token');

      const result = await service.initiateOAuthFlow(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      // Check if the result is an array (successful login)
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[1]).toBe('new-session-token');
        expect(mockPrismaService.userLoginLog.create).toHaveBeenCalledWith({
          data: {
            userId: 1,
            ip: 'ip',
            userAgent: 'agent',
          },
        });
        expect(
          mockPrismaService.userOAuthConnection.update,
        ).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            rawProfile: userInfo,
            updatedAt: expect.any(Date),
          },
        });
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

      // Mock Redis for SRP session storage
      mockRedis.setex.mockResolvedValue('OK');

      // Mock SRP service for server session creation
      mockSrpService.createServerSession.mockResolvedValueOnce({
        serverEphemeral: {
          public: 'server-public-key',
          secret: 'server-secret-key',
        },
      });

      const result = await service.initiateOAuthFlow(
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
        expect(result.salt).toBe('salt');
        expect(result.serverPublicEphemeral).toBe('server-public-key');
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

      const result = await service.initiateOAuthFlow(
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

    it('should require decision when no conflicts exist', async () => {
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

      // Mock AuthService.sign for generating state token
      mockAuthService.sign.mockReturnValueOnce('mock-state-token');

      const result = await service.initiateOAuthFlow(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      if ('requiresDecision' in result) {
        expect(result.requiresDecision).toBe(true);
        expect(result.stateToken).toBe('mock-state-token');
      } else {
        fail('Expected decision requirement for new user');
      }
    });

    it('should require decision when no email provided', async () => {
      const providerId = 'test';
      const userInfo = {
        id: '123',
        name: 'User Without Email',
      };

      // Mock no existing OAuth connection
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValueOnce(
        null,
      );

      // Mock AuthService.sign for generating state token
      mockAuthService.sign.mockReturnValueOnce('mock-state-token');

      const result = await service.initiateOAuthFlow(
        providerId,
        userInfo,
        'ip',
        'agent',
      );

      if ('requiresDecision' in result) {
        expect(result.requiresDecision).toBe(true);
        expect(result.stateToken).toBe('mock-state-token');
      } else {
        fail('Expected decision requirement for user without email');
      }
    });
  });

  describe('getOAuthStateInfo', () => {
    it('should decode state token and return user info', async () => {
      const stateToken = 'valid-state-token';
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          preferredUsername: 'testuser',
        },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: Date.now(),
      };

      // Mock AuthService methods
      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock username generation
      mockPrismaService.user.count.mockResolvedValueOnce(0); // username available
      mockPrismaService.user.count.mockResolvedValueOnce(0); // email not registered

      const result = await service.getOAuthStateInfo(stateToken);

      expect(result.providerId).toBe('test');
      expect(result.userInfo.id).toBe('123');
      expect(result.userInfo.email).toBe('test@example.com');
      expect(result.suggestedUsername).toMatch(/testuser/);
      expect(result.suggestedNickname).toMatch(/Test_User/);
      expect(result.emailConflict).toBe(false);
    });
  });

  describe('createOAuthUserFromDecision', () => {
    it('should create new user from decision', async () => {
      const stateToken = 'valid-state-token';
      const username = 'newuser';
      const nickname = 'New_User';
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          email: 'new@example.com',
          name: 'New User',
        },
      };

      // Mock token decoding
      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock validation checks
      mockPrismaService.user.count.mockResolvedValueOnce(0); // username available
      mockPrismaService.user.count.mockResolvedValueOnce(0); // email not registered

      // Mock transaction
      const createdUser = {
        id: 11,
        username: 'newuser',
        email: 'new@example.com',
      };

      mockPrismaService.$transaction.mockImplementationOnce(
        async (callback) => {
          const tx = {
            user: { create: jest.fn().mockResolvedValue(createdUser) },
            userProfile: { create: jest.fn().mockResolvedValue({}) },
            userOAuthConnection: { create: jest.fn().mockResolvedValue({}) },
            userRegisterLog: { create: jest.fn().mockResolvedValue({}) },
            userLoginLog: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return createdUser;
        },
      );

      // Mock getOAuthUserDtoById
      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValueOnce({
        id: 11,
        username: 'newuser',
        nickname: 'New_User',
        email: 'new@example.com',
        avatarId: 1,
        intro: 'This user has not set an introduction yet.',
        follow_count: 0,
        fans_count: 0,
        question_count: 0,
        answer_count: 0,
        is_follow: false,
      });

      const result = await service.createOAuthUserFromDecision(
        stateToken,
        username,
        nickname,
        'ip',
        'agent',
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].username).toBe('newuser');
      expect(result[1]).toBe('new-session-token');
    });

    it('should throw error for invalid state token in createOAuthUserFromDecision', async () => {
      const stateToken = 'invalid-token';
      const username = 'newuser';
      const nickname = 'New_User';

      mockAuthService.audit.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Invalid or expired OAuth state token');
    });

    it('should throw error for invalid username format', async () => {
      const stateToken = 'valid-state-token';
      const username = 'ab'; // Too short
      const nickname = 'Valid_Nickname';
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      await expect(
        service.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Username must be 4-32 characters long');
    });

    it('should throw error for invalid nickname format', async () => {
      const stateToken = 'valid-state-token';
      const username = 'validuser';
      const nickname = 'Invalid@Nickname!'; // Contains invalid characters
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      await expect(
        service.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Nickname must be 1-16 characters long');
    });

    it('should throw error when username already registered', async () => {
      const stateToken = 'valid-state-token';
      const username = 'existinguser';
      const nickname = 'Valid_Nickname';
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock username already taken
      mockPrismaService.user.count.mockResolvedValueOnce(1);

      await expect(
        service.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Username already registered: existinguser');
    });

    it('should throw error when email conflict occurs (race condition)', async () => {
      const stateToken = 'valid-state-token';
      const username = 'newuser';
      const nickname = 'New_User';
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          email: 'conflict@example.com',
        },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Username available but email conflict occurs
      mockPrismaService.user.count
        .mockResolvedValueOnce(0) // username available
        .mockResolvedValueOnce(1); // email conflict

      await expect(
        service.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Email already registered: conflict@example.com');
    });

    it('should create user without email (placeholder email)', async () => {
      const stateToken = 'valid-state-token';
      const username = 'newuser';
      const nickname = 'New_User';
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          name: 'User Without Email',
          // No email provided
        },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock validation checks
      mockPrismaService.user.count.mockResolvedValueOnce(0); // username available

      // Mock transaction
      const createdUser = {
        id: 11,
        username: 'newuser',
        email: 'oauth-test-123@placeholder.internal', // Placeholder email
      };

      mockPrismaService.$transaction.mockImplementationOnce(
        async (callback) => {
          const tx = {
            user: { create: jest.fn().mockResolvedValue(createdUser) },
            userProfile: { create: jest.fn().mockResolvedValue({}) },
            userOAuthConnection: { create: jest.fn().mockResolvedValue({}) },
            userRegisterLog: { create: jest.fn().mockResolvedValue({}) },
            userLoginLog: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return createdUser;
        },
      );

      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValueOnce({
        id: 11,
        username: 'newuser',
        nickname: 'New_User',
        email: null, // Should be null for placeholder emails
        avatarId: 1,
        intro: 'This user has not set an introduction yet.',
        follow_count: 0,
        fans_count: 0,
        question_count: 0,
        answer_count: 0,
        is_follow: false,
      });

      const result = await service.createOAuthUserFromDecision(
        stateToken,
        username,
        nickname,
        'ip',
        'agent',
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].username).toBe('newuser');
      expect(result[0].email).toBe(null); // Placeholder email should be filtered out
    });
  });

  describe('OAuth helper methods', () => {
    it('should not create a new OAuth connection if one already exists', async () => {
      const userId = 1;
      const providerId = 'test';
      const userInfo: OAuthUserInfo = { id: 'user123' };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue({
        id: 1,
      }); // connection exists

      await (service as any).createOAuthConnection(
        userId,
        providerId,
        userInfo,
      );

      expect(
        mockPrismaService.userOAuthConnection.create,
      ).not.toHaveBeenCalled();
    });

    it('should create a new OAuth connection if none exists', async () => {
      const userId = 1;
      const providerId = 'test';
      const userInfo: OAuthUserInfo = { id: 'user123', name: 'Test User' };

      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.userOAuthConnection.create.mockResolvedValue({
        id: 1,
        userId,
        providerId,
        providerUserId: userInfo.id,
      });

      await (service as any).createOAuthConnection(
        userId,
        providerId,
        userInfo,
      );

      expect(mockPrismaService.userOAuthConnection.create).toHaveBeenCalledWith(
        {
          data: {
            userId,
            providerId,
            providerUserId: userInfo.id,
            rawProfile: userInfo,
          },
        },
      );
    });
  });

  describe('bindOAuthToExistingUser', () => {
    it('should bind OAuth to existing user with password verification', async () => {
      const stateToken = 'valid-state-token';
      const username = 'existinguser';
      const credentials = { password: 'correct-password' };
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      // Mock token decoding
      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock user lookup
      const mockUser = {
        id: 1,
        username: 'existinguser',
        email: 'test@example.com',
        srpUpgraded: false,
        hashedPassword: 'hashed-password',
        srpSalt: null,
        srpVerifier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        avatarUrl: null,
        nickname: null,
        bio: null,
        totpSecret: null,
        totpAlwaysRequired: false,
        deletedAt: null,
        totpEnabled: false,
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(mockUser);

      // Mock password verification
      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValue({
          verified: true,
          wasUpgraded: false,
        });

      // Mock OAuth connection check and creation
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      jest
        .spyOn(service as any, 'createOAuthConnection')
        .mockResolvedValue(undefined);

      // Mock login log
      mockPrismaService.userLoginLog.create.mockResolvedValue({});

      // Mock session creation and user DTO
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValue('session-token');
      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValue({
        id: 1,
        username: 'existinguser',
        email: 'test@example.com',
      } as any);

      const result = await service.bindOAuthToExistingUser(
        stateToken,
        username,
        credentials,
        'ip',
        'agent',
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].username).toBe('existinguser');
      expect(result[1]).toBe('session-token');
    });

    it('should throw error for invalid credentials', async () => {
      const stateToken = 'valid-state-token';
      const username = 'existinguser';
      const credentials = { password: 'wrong-password' };
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      const mockUser = {
        id: 1,
        username: 'existinguser',
        email: 'test@example.com',
        srpUpgraded: false,
        hashedPassword: 'hashed-password',
        srpSalt: null,
        srpVerifier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        avatarUrl: null,
        nickname: null,
        bio: null,
        totpSecret: null,
        totpAlwaysRequired: false,
        deletedAt: null,
        totpEnabled: false,
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(mockUser);

      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValue({
          verified: false,
          wasUpgraded: false,
        });

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow();
    });

    it('should throw error for invalid state token', async () => {
      const stateToken = 'invalid-token';
      const username = 'existinguser';
      const credentials = { password: 'password' };

      mockAuthService.audit.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Invalid or expired OAuth state token');
    });

    it('should throw error for SRP user in binding flow', async () => {
      const stateToken = 'valid-state-token';
      const username = 'srpuser';
      const credentials = {
        clientPublicEphemeral: 'client-public',
        clientProof: 'client-proof',
      };
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      const srpUser = {
        id: 1,
        username: 'srpuser',
        srpUpgraded: true,
        srpSalt: 'salt',
        srpVerifier: 'verifier',
        hashedPassword: null,
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(srpUser as any);

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow(
        'SRP users should use the verification flow, not the decision flow',
      );
    });

    it('should throw error when password not provided', async () => {
      const stateToken = 'valid-state-token';
      const username = 'user';
      const credentials = {}; // No password
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      const mockUser = {
        id: 1,
        username: 'user',
        srpUpgraded: false,
        hashedPassword: 'hash',
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(mockUser as any);

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('Password required for this user');
    });

    it('should throw error when OAuth account already linked to same user', async () => {
      const stateToken = 'valid-state-token';
      const username = 'user';
      const credentials = { password: 'password' };
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      const mockUser = {
        id: 1,
        username: 'user',
        srpUpgraded: false,
        hashedPassword: 'hash',
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(mockUser as any);

      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValue({ verified: true, wasUpgraded: false });

      // Mock existing connection to same user
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        providerId: 'test',
        providerUserId: '123',
      });

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('This OAuth account is already linked to your account');
    });

    it('should throw error when OAuth account already linked to another user', async () => {
      const stateToken = 'valid-state-token';
      const username = 'user';
      const credentials = { password: 'password' };
      const mockTokenData = {
        providerId: 'test',
        userInfo: { id: '123' },
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      const mockUser = {
        id: 1,
        username: 'user',
        srpUpgraded: false,
        hashedPassword: 'hash',
      };
      jest
        .spyOn(service, 'findUserRecordByUsernameOrThrow')
        .mockResolvedValue(mockUser as any);

      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValue({ verified: true, wasUpgraded: false });

      // Mock existing connection to different user
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue({
        id: 1,
        userId: 2, // Different user
        providerId: 'test',
        providerUserId: '123',
      });

      await expect(
        service.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          'ip',
          'agent',
        ),
      ).rejects.toThrow('This OAuth account is already linked to another user');
    });
  });

  describe('completeOAuthVerification', () => {
    it('should complete password verification successfully', async () => {
      const sessionId = 'password-session-123';
      const credentials = { password: 'correct-password' };
      const sessionData = {
        type: 'password',
        providerId: 'test',
        userInfo: { id: '123', name: 'Test User' },
        existingUserId: 1,
        existingUsername: 'testuser',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        srpUpgraded: false,
        srpSalt: null,
        srpVerifier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        avatarUrl: null,
        nickname: null,
        bio: null,
        totpSecret: null,
        totpAlwaysRequired: false,
        deletedAt: null,
        totpEnabled: false,
      };
      jest.spyOn(service, 'findUserRecordOrThrow').mockResolvedValue(mockUser);

      jest
        .spyOn(service as any, 'authenticateUserWithPassword')
        .mockResolvedValue({
          verified: true,
          wasUpgraded: false,
        });

      jest
        .spyOn(service as any, 'createOAuthConnection')
        .mockResolvedValue(undefined);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});

      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValue({
        id: 1,
        username: 'testuser',
      } as any);
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValue('session-token');

      const result = await service.completeOAuthVerification(
        sessionId,
        credentials,
        'ip',
        'agent',
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].username).toBe('testuser');
      expect(result[1]).toBe('session-token');
      expect(mockRedis.del).toHaveBeenCalledWith(`oauth_session:${sessionId}`);
    });

    it('should complete SRP verification successfully', async () => {
      const sessionId = 'srp-session-123';
      const credentials = {
        clientPublicEphemeral: 'client-public',
        clientProof: 'client-proof',
      };
      const sessionData = {
        type: 'srp',
        providerId: 'test',
        userInfo: { id: '123' },
        existingUserId: 1,
        serverEphemeral: { secret: 'server-secret' },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        srpSalt: 'salt',
        srpVerifier: 'verifier',
        hashedPassword: null,
        srpUpgraded: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPasswordChangedAt: new Date(),
        avatarUrl: null,
        nickname: null,
        bio: null,
        totpSecret: null,
        totpAlwaysRequired: false,
        deletedAt: null,
        totpEnabled: false,
      };
      jest.spyOn(service, 'findUserRecordOrThrow').mockResolvedValue(mockUser);

      mockSrpService.verifyClient.mockResolvedValue({ success: true });
      jest
        .spyOn(service as any, 'createOAuthConnection')
        .mockResolvedValue(undefined);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});

      jest.spyOn(service, 'getOAuthUserDtoById').mockResolvedValue({
        id: 1,
        username: 'testuser',
      } as any);
      jest
        .spyOn(service as any, 'createSession')
        .mockResolvedValue('session-token');

      const result = await service.completeOAuthVerification(
        sessionId,
        credentials,
        'ip',
        'agent',
      );

      expect(Array.isArray(result)).toBe(true);
      expect(mockSrpService.verifyClient).toHaveBeenCalledWith(
        'server-secret',
        'client-public',
        'salt',
        'testuser',
        'verifier',
        'client-proof',
      );
    });

    it('should throw error for expired session', async () => {
      const sessionId = 'expired-session';
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.completeOAuthVerification(sessionId, {}, 'ip', 'agent'),
      ).rejects.toThrow('OAuth session not found or expired');
    });
  });

  describe('OAuth binding management', () => {
    it('should initialize OAuth binding successfully', async () => {
      const userId = 1;
      const providerId = 'test';
      const state = 'optional-state';

      jest.spyOn(service, 'findUserRecordOrThrow').mockResolvedValue({
        id: userId,
        username: 'testuser',
      } as any);

      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.initOAuthBinding(userId, providerId, state);

      expect(result.bindingSessionId).toMatch(/^oauth_binding_/);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^oauth_binding_session:/),
        15 * 60,
        expect.stringContaining('"type":"binding"'),
      );
    });

    it('should handle OAuth binding callback successfully', async () => {
      const providerId = 'test';
      const userInfo = { id: '123', name: 'Test User' };
      const bindingSessionId = 'binding-session-123';
      const sessionData = {
        type: 'binding',
        userId: 1,
        providerId: 'test',
        originalState: 'state',
        createdAt: new Date().toISOString(),
      };

      // Reset all mocks for this test
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
      mockPrismaService.userOAuthConnection.findUnique.mockReset();
      mockPrismaService.userOAuthConnection.findFirst.mockReset();

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      // Mock no existing connection
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue(null);

      jest
        .spyOn(service as any, 'createOAuthConnection')
        .mockResolvedValue(undefined);

      const result = await service.handleOAuthBindingCallback(
        providerId,
        userInfo,
        bindingSessionId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('OAuth account linked successfully');
      expect(mockRedis.del).toHaveBeenCalledWith(
        `oauth_binding_session:${bindingSessionId}`,
      );
    });

    it('should handle OAuth binding callback with already linked account', async () => {
      const providerId = 'test';
      const userInfo = { id: '123', name: 'Test User' };
      const bindingSessionId = 'binding-session-123';
      const sessionData = {
        type: 'binding',
        userId: 1,
        providerId: 'test',
      };

      // Reset all mocks for this test
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
      mockPrismaService.userOAuthConnection.findUnique.mockReset();
      mockPrismaService.userOAuthConnection.findFirst.mockReset();

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      // Mock existing connection to same user
      // This is the main check in handleOAuthBindingCallback
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue({
        id: 1,
        userId: 1, // Same user as in session
        providerId,
        providerUserId: userInfo.id,
      });

      const result = await service.handleOAuthBindingCallback(
        providerId,
        userInfo,
        bindingSessionId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'This OAuth account is already linked to your account',
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        `oauth_binding_session:${bindingSessionId}`,
      );
    });

    it('should handle OAuth binding callback with account linked to another user', async () => {
      const providerId = 'test';
      const userInfo = { id: '123', name: 'Test User' };
      const bindingSessionId = 'binding-session-123';
      const sessionData = {
        type: 'binding',
        userId: 1,
        providerId: 'test',
      };

      // Reset all mocks for this test
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
      mockPrismaService.userOAuthConnection.findUnique.mockReset();
      mockPrismaService.userOAuthConnection.findFirst.mockReset();

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      // Mock existing connection to different user
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue({
        id: 1,
        userId: 2, // Different user than in session
        providerId,
        providerUserId: userInfo.id,
      });

      const result = await service.handleOAuthBindingCallback(
        providerId,
        userInfo,
        bindingSessionId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'This OAuth account is already linked to another user',
      );
    });

    it('should handle OAuth binding callback with existing provider connection', async () => {
      const providerId = 'test';
      const userInfo = { id: '123', name: 'Test User' };
      const bindingSessionId = 'binding-session-123';
      const sessionData = {
        type: 'binding',
        userId: 1,
        providerId: 'test',
      };

      // Reset all mocks for this test
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
      mockPrismaService.userOAuthConnection.findUnique.mockReset();
      mockPrismaService.userOAuthConnection.findFirst.mockReset();

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);

      // Mock no existing connection for this specific OAuth account
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

      // Mock existing connection for same provider but different account
      mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue({
        id: 2,
        userId: 1,
        providerId,
        providerUserId: 'different-account',
      });

      const result = await service.handleOAuthBindingCallback(
        providerId,
        userInfo,
        bindingSessionId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        `You have already linked another ${providerId} account. Please unbind it first.`,
      );
    });

    it('should get user OAuth connections', async () => {
      const userId = 1;
      const mockConnections = [
        {
          id: 1,
          providerId: 'google',
          providerUserId: 'google123',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          providerId: 'github',
          providerUserId: 'github456',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.userOAuthConnection.findMany.mockResolvedValue(
        mockConnections,
      );

      const result = await service.getUserOAuthConnections(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        providerId: 'google',
        providerName: 'Google',
        providerUserId: 'google123',
        connectedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result[1]).toEqual({
        id: 2,
        providerId: 'github',
        providerName: 'GitHub',
        providerUserId: 'github456',
        connectedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should unbind OAuth connection successfully', async () => {
      const userId = 1;
      const connectionId = 1;

      // Mock connection exists and belongs to user
      mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue({
        id: connectionId,
        userId,
        providerId: 'google',
        providerUserId: 'google123',
      });

      // Mock user has multiple connections
      mockPrismaService.userOAuthConnection.count.mockResolvedValue(2);

      // Mock user has password
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        hashedPassword: 'hashed-password',
        srpUpgraded: true,
      });

      mockPrismaService.userOAuthConnection.delete.mockResolvedValue({
        id: connectionId,
      });

      const result = await service.unbindOAuth(userId, connectionId);

      expect(result.success).toBe(true);
      expect(result.unboundConnectionId).toBe(connectionId);
      expect(mockPrismaService.userOAuthConnection.delete).toHaveBeenCalledWith(
        {
          where: { id: connectionId },
        },
      );
    });

    it('should not allow unbinding the only authentication method', async () => {
      const userId = 1;
      const connectionId = 1;

      mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue({
        id: connectionId,
        userId,
      });

      // Mock user has only one connection
      mockPrismaService.userOAuthConnection.count.mockResolvedValue(1);

      // Mock user has no password
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        hashedPassword: null,
        srpUpgraded: false,
      });

      await expect(service.unbindOAuth(userId, connectionId)).rejects.toThrow(
        'Cannot unbind the only authentication method. Please set a password first.',
      );
    });

    it('should throw error when trying to unbind non-existent connection', async () => {
      const userId = 1;
      const connectionId = 999;

      mockPrismaService.userOAuthConnection.findFirst.mockResolvedValue(null);

      await expect(service.unbindOAuth(userId, connectionId)).rejects.toThrow(
        'OAuth connection not found or does not belong to this user',
      );
    });
  });

  describe('Login functionality', () => {
    // Get bcrypt mock
    const bcrypt = jest.requireMock('bcryptjs');

    describe('secureLogin', () => {
      it('should perform dummy password comparison when user does not exist', async () => {
        const username = 'nonexistentuser';
        const password = 'anypassword';

        // Mock user not found
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        // Mock dummy password comparison
        bcrypt.compare.mockResolvedValue(false);

        await expect(
          service.login(username, password, 'ip', 'agent'),
        ).rejects.toThrow();

        // Verify dummy comparison was performed
        expect(bcrypt.compare).toHaveBeenCalledWith(
          password,
          '$2a$10$N9qo8uLOickgx2ZMRZoMye.IUlKdJvQq1iRgMZdRJUjN1zF4JTqSK',
        );
      });

      it('should perform dummy password comparison when database error occurs', async () => {
        const username = 'testuser';
        const password = 'password';

        // Mock database error
        mockPrismaService.user.findUnique.mockRejectedValue(
          new Error('Database error'),
        );

        // Mock dummy password comparison
        bcrypt.compare.mockResolvedValue(false);

        await expect(
          service.login(username, password, 'ip', 'agent'),
        ).rejects.toThrow();

        // Verify dummy comparison was performed
        expect(bcrypt.compare).toHaveBeenCalledWith(
          password,
          '$2a$10$N9qo8uLOickgx2ZMRZoMye.IUlKdJvQq1iRgMZdRJUjN1zF4JTqSK',
        );
      });

      it('should throw generic error when password verification fails', async () => {
        const username = 'testuser';
        const password = 'wrongpassword';

        const mockUser = {
          id: 1,
          username: 'testuser',
          hashedPassword: 'hashed-password',
          srpUpgraded: false,
          totpEnabled: false,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        // Mock password verification failure
        jest
          .spyOn(service as any, 'authenticateUserWithPassword')
          .mockResolvedValue({
            verified: false,
            wasUpgraded: false,
          });

        await expect(
          service.login(username, password, 'ip', 'agent'),
        ).rejects.toThrow('Invalid username or password.');
      });

      it('should handle TOTP requirement during login', async () => {
        const username = 'testuser';
        const password = 'correctpassword';

        const mockUser = {
          id: 1,
          username: 'testuser',
          hashedPassword: 'hashed-password',
          srpUpgraded: false,
          totpEnabled: true,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        // Mock password verification success
        jest
          .spyOn(service as any, 'authenticateUserWithPassword')
          .mockResolvedValue({
            verified: true,
            wasUpgraded: false,
          });

        // Mock TOTP requirement
        jest.spyOn(service as any, 'shouldRequire2FA').mockResolvedValue(true);

        // Mock TOTP service
        mockTOTPService.generateTempToken = jest
          .fn()
          .mockReturnValue('temp-token');

        await expect(
          service.login(username, password, 'ip', 'agent'),
        ).rejects.toThrow("2FA verification required for user 'testuser'");
      });

      it('should login successfully when TOTP is not required', async () => {
        const username = 'testuser';
        const password = 'correctpassword';

        const mockUser = {
          id: 1,
          username: 'testuser',
          hashedPassword: 'hashed-password',
          srpUpgraded: false,
          totpEnabled: true,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        // Mock the batch queries for getUsersDtoByIds
        mockPrismaService.user.findMany.mockResolvedValue([
          {
            id: 1,
            username: 'testuser',
            userProfile: {
              nickname: 'Test User',
              avatarId: 1,
              intro: 'Test intro',
            },
          },
        ]);

        // Mock password verification success
        jest
          .spyOn(service as any, 'authenticateUserWithPassword')
          .mockResolvedValue({
            verified: true,
            wasUpgraded: false,
          });

        // Mock TOTP not required (known device/IP)
        jest.spyOn(service as any, 'shouldRequire2FA').mockResolvedValue(false);

        mockPrismaService.userLoginLog.create.mockResolvedValue({});

        const result = await service.login(username, password, 'ip', 'agent');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(mockPrismaService.userLoginLog.create).toHaveBeenCalledWith({
          data: {
            userId: 1,
            ip: 'ip',
            userAgent: 'agent',
          },
        });
      });
    });

    describe('verifyTOTPAndLogin', () => {
      it('should complete login after TOTP verification', async () => {
        const tempToken = 'valid-temp-token';
        const code = '123456';

        const mockAuth = {
          userId: 1,
          username: 'testuser',
          permissions: [],
        };

        mockAuthService.verify.mockReturnValue(mockAuth);
        mockAuthService.audit.mockResolvedValue(undefined);

        mockTOTPService.verify2FA = jest.fn().mockResolvedValue({
          isValid: true,
          usedBackupCode: false,
        });

        mockPrismaService.userLoginLog.create.mockResolvedValue({});

        const result = await service.verifyTOTPAndLogin(
          tempToken,
          code,
          'ip',
          'agent',
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(3);
        expect(result[2]).toBe(false); // usedBackupCode
        expect(mockTOTPService.verify2FA).toHaveBeenCalledWith(1, code);
      });

      it('should indicate backup code usage', async () => {
        const tempToken = 'valid-temp-token';
        const backupCode = 'backup123';

        const mockAuth = {
          userId: 1,
          username: 'testuser',
          permissions: [],
        };

        mockAuthService.verify.mockReturnValue(mockAuth);
        mockAuthService.audit.mockResolvedValue(undefined);

        mockTOTPService.verify2FA = jest.fn().mockResolvedValue({
          isValid: true,
          usedBackupCode: true,
        });

        mockPrismaService.userLoginLog.create.mockResolvedValue({});

        const result = await service.verifyTOTPAndLogin(
          tempToken,
          backupCode,
          'ip',
          'agent',
        );

        expect(result[2]).toBe(true); // usedBackupCode
      });

      it('should throw error for invalid TOTP code', async () => {
        const tempToken = 'valid-temp-token';
        const code = 'invalid';

        const mockAuth = {
          userId: 1,
          username: 'testuser',
          permissions: [],
        };

        mockAuthService.verify.mockReturnValue(mockAuth);
        mockAuthService.audit.mockResolvedValue(undefined);

        mockTOTPService.verify2FA = jest.fn().mockResolvedValue({
          isValid: false,
          usedBackupCode: false,
        });

        await expect(
          service.verifyTOTPAndLogin(tempToken, code, 'ip', 'agent'),
        ).rejects.toThrow('Invalid 2FA code');
      });

      it('should throw error for invalid temp token', async () => {
        const tempToken = 'invalid-temp-token';
        const code = '123456';

        mockAuthService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await expect(
          service.verifyTOTPAndLogin(tempToken, code, 'ip', 'agent'),
        ).rejects.toThrow(
          'Invalid or expired temporary token for 2FA verification',
        );
      });
    });
  });

  describe('getOAuthStateInfo edge cases', () => {
    it('should handle invalid state token gracefully', async () => {
      const stateToken = 'invalid-token';

      mockAuthService.audit.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.getOAuthStateInfo(stateToken)).rejects.toThrow(
        'Invalid or expired OAuth state token',
      );
    });

    it('should generate valid suggested usernames and nicknames', async () => {
      const stateToken = 'valid-state-token';
      const mockTokenData = {
        providerId: 'test',
        userInfo: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User!@#', // Contains special characters
          preferredUsername: 'test-user',
        },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: Date.now(),
      };

      mockAuthService.audit.mockReturnValueOnce(undefined);
      mockAuthService.decode.mockReturnValueOnce({
        authorization: {
          permissions: [
            {
              authorizedResource: {
                data: mockTokenData,
              },
            },
          ],
        },
      });

      // Mock username availability check
      mockPrismaService.user.count.mockResolvedValueOnce(0); // username available
      mockPrismaService.user.count.mockResolvedValueOnce(0); // email not registered

      const result = await service.getOAuthStateInfo(stateToken);

      expect(result.suggestedUsername).toMatch(/test-user/);
      expect(result.suggestedNickname).toMatch(/Test_User/); // Special chars should be replaced
      expect(result.suggestedNickname.length).toBeLessThanOrEqual(16);
    });
  });

  describe('Legacy OAuth tests (for compatibility)', () => {
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
        avatarId: 1,
        intro: 'Test intro',
        follow_count: 0,
        fans_count: 0,
        question_count: 0,
        answer_count: 0,
        is_follow: false,
      });

      // Mock createSession method (it's private, so we need to mock the sessionService.createSession instead)
      jest
        .spyOn(mockSessionService, 'createSession')
        .mockResolvedValue('new-session-token');
    });

    it('should login existing user with OAuth connection', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(
        mockOAuthConnection,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaService.userLoginLog.create.mockResolvedValue({});
      mockPrismaService.userOAuthConnection.update.mockResolvedValue({});

      const result = await service.initiateOAuthFlow(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[1]).toBe('new-session-token');
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

      // Add mock for createDefaultProfileForUser which creates a userProfile
      mockPrismaService.userProfile.create.mockResolvedValueOnce({
        id: 1,
        userId: 1,
        nickname: 'existing-user',
        avatarId: 1,
        intro: 'This user has not set an introduction yet.',
      });

      await service.initiateOAuthFlow(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          nickname: 'existing-user',
          intro: 'This user has not set an introduction yet.',
          avatarId: 1,
        },
      });
    });

    it('should require verification when email matches existing user', async () => {
      mockPrismaService.userOAuthConnection.findUnique.mockResolvedValue(null);

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

      const result = await service.initiateOAuthFlow(
        'test',
        mockUserInfo,
        '127.0.0.1',
        'test-agent',
      );

      if ('requiresVerification' in result) {
        expect(result.requiresVerification).toBe(true);
        expect(result.verificationType).toBe('password');
        expect(result.email).toBe('test@ruc.edu.cn');
      } else {
        fail('Expected verification requirement for existing user');
      }
    });
  });
});

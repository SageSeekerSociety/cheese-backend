/*
 * Description: Unit tests for Users Controller
 *
 * Author(s):
 *      AI Assistant
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AnswerService } from '../answer/answer.service';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { OAuthService } from '../auth/oauth/oauth.service';
import { SessionService } from '../auth/session.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { TOTPService } from './totp.service';
import { UsersController } from './users.controller';
import {
  EmailAlreadyRegisteredError,
  InvalidEmailAddressError,
  TOTPRequiredError,
  UserIdNotFoundError,
  UsernameNotFoundError,
} from './users.error';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let authService: AuthService;
  let sessionService: SessionService;
  let totpService: TOTPService;
  let oauthService: OAuthService;

  const mockUsersService = {
    sendRegisterEmailCode: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    getUserDtoById: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
    verifyAndResetPassword: jest.fn(),
    updateUserProfile: jest.fn(),
    addFollowRelationship: jest.fn(),
    deleteFollowRelationship: jest.fn(),
    getFollowers: jest.fn(),
    getFollowees: jest.fn(),
    getUserAskedQuestions: jest.fn(),
    getUserAnsweredAnswers: jest.fn(),
    getFollowedQuestions: jest.fn(),
    generatePasskeyRegistrationOptions: jest.fn(),
    verifyPasskeyRegistration: jest.fn(),
    generatePasskeyAuthenticationOptions: jest.fn(),
    verifyPasskeyAuthentication: jest.fn(),
    handlePasskeyLogin: jest.fn(),
    getUserPasskeys: jest.fn(),
    deletePasskey: jest.fn(),
    verifySudo: jest.fn(),
    verifyTOTPAndLogin: jest.fn(),
    srpInit: jest.fn(),
    srpVerify: jest.fn(),
    changePassword: jest.fn(),
    loginWithOAuth: jest.fn(),
    completeOAuthVerification: jest.fn(),
    initOAuthBinding: jest.fn(),
    getUserOAuthConnections: jest.fn(),
    unbindOAuth: jest.fn(),
    createSessionForNewUser: jest.fn(),
    findUserRecordByUsernameOrThrow: jest.fn(),
    getFollowingCount: jest.fn().mockResolvedValue(5),
    findUserRecordOrThrow: jest.fn(),
  };

  const mockAuthService = {
    decode: jest.fn(),
    sign: jest.fn(),
  };

  // Mock AuthService.instance for guard decorator
  beforeAll(() => {
    (AuthService as any).instance = {
      audit: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterAll(() => {
    // Clean up the mock
    delete (AuthService as any).instance;
  });

  const mockSessionService = {
    refreshSession: jest.fn(),
    revokeSession: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    passkey: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockTOTPService = {
    generateSecret: jest.fn(),
    generateTOTPSecret: jest.fn().mockReturnValue('secret123'),
    generateTOTPUri: jest.fn().mockReturnValue('otpauth://totp/test'),
    getQRCodeDataURL: jest.fn(),
    verify: jest.fn(),
    generateBackupCodes: jest.fn(),
    get2FAStatus: jest.fn(),
    enable2FA: jest.fn(),
    disable2FA: jest.fn(),
    update2FASettings: jest.fn(),
  };

  const mockAnswerService = {
    getAnsweredAnswers: jest.fn(),
  };

  const mockQuestionsService = {
    getAskedQuestions: jest.fn(),
    getFollowedQuestions: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'cookieBasePath') return '/api';
      if (key === 'FRONTEND_BASE_URL') return 'http://localhost:3000';
      if (key === 'FRONTEND_OAUTH_SUCCESS_PATH') return '/oauth-success';
      return undefined;
    }),
  };

  const mockOAuthService = {
    getProviders: jest.fn().mockResolvedValue([
      { id: 'google', name: 'Google' },
      { id: 'github', name: 'GitHub' },
    ]),
    getProvidersConfig: jest.fn().mockResolvedValue([
      { id: 'google', name: 'Google' },
      { id: 'github', name: 'GitHub' },
    ]),
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    generateAuthorizationUrl: jest
      .fn()
      .mockResolvedValue('https://oauth.provider/auth'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TOTPService, useValue: mockTOTPService },
        {
          provide: AnswerService,
          useValue: mockAnswerService,
        },
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OAuthService, useValue: mockOAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
    sessionService = module.get<SessionService>(SessionService);
    totpService = module.get<TOTPService>(TOTPService);
    oauthService = module.get<OAuthService>(OAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRegisterEmailCode', () => {
    it('should send email verification code successfully', async () => {
      mockUsersService.sendRegisterEmailCode.mockResolvedValue(undefined);

      const result = await controller.sendRegisterEmailCode(
        { email: 'test@example.com' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toEqual({
        code: 201,
        message: 'Send email successfully.',
      });
      expect(mockUsersService.sendRegisterEmailCode).toHaveBeenCalledWith(
        'test@example.com',
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should throw error when email is invalid', async () => {
      mockUsersService.sendRegisterEmailCode.mockRejectedValue(
        new InvalidEmailAddressError('invalid-email'),
      );

      await expect(
        controller.sendRegisterEmailCode(
          { email: 'invalid-email' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(InvalidEmailAddressError);
    });

    it('should throw error when email is already registered', async () => {
      mockUsersService.sendRegisterEmailCode.mockRejectedValue(
        new EmailAlreadyRegisteredError('test@example.com'),
      );

      await expect(
        controller.sendRegisterEmailCode(
          { email: 'test@example.com' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(EmailAlreadyRegisteredError);
    });
  });

  describe('register', () => {
    const mockRequest = {} as Request;
    const mockResponse = {
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register user with SRP and auto-login', async () => {
      const mockUserDto = {
        id: 1,
        username: 'testuser',
        nickname: 'Test User',
        email: 'test@example.com',
      };

      mockUsersService.register.mockResolvedValue(mockUserDto);
      mockUsersService.createSessionForNewUser.mockResolvedValue('temp-token');
      mockSessionService.refreshSession.mockResolvedValue([
        'refresh-token',
        'access-token',
      ]);
      mockAuthService.decode.mockReturnValue({
        validUntil: Date.now() + 86400000,
      });

      const result = await controller.register(
        {
          username: 'testuser',
          nickname: 'Test User',
          srpSalt: 'salt',
          srpVerifier: 'verifier',
          email: 'test@example.com',
          emailCode: '123456',
        },
        '127.0.0.1',
        'test-agent',
        mockRequest,
        mockResponse,
      );

      expect(mockUsersService.register).toHaveBeenCalledWith(
        'testuser',
        'Test User',
        'salt',
        'verifier',
        'test@example.com',
        '123456',
        '127.0.0.1',
        'test-agent',
        undefined,
        undefined,
      );
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 201,
        message: 'Register successfully.',
        data: {
          user: mockUserDto,
          accessToken: 'access-token',
        },
      });
    });
  });

  describe('login', () => {
    const mockResponse = {
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    it('should login successfully', async () => {
      const mockUserDto = {
        id: 1,
        username: 'testuser',
        nickname: 'Test User',
        email: 'test@example.com',
      };

      mockUsersService.login.mockResolvedValue([mockUserDto, 'refresh-token']);
      mockSessionService.refreshSession.mockResolvedValue([
        'new-refresh-token',
        'access-token',
      ]);
      mockAuthService.decode.mockReturnValue({
        validUntil: Date.now() + 86400000,
      });

      await controller.login(
        { username: 'testuser', password: 'password123' },
        '127.0.0.1',
        'test-agent',
        mockResponse,
      );

      expect(mockUsersService.login).toHaveBeenCalledWith(
        'testuser',
        'password123',
        '127.0.0.1',
        'test-agent',
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 201,
        message: 'Login successfully.',
        data: {
          user: mockUserDto,
          accessToken: 'access-token',
          requires2FA: false,
        },
      });
    });

    it('should handle 2FA requirement', async () => {
      mockUsersService.login.mockRejectedValue(
        new TOTPRequiredError('testuser', 'temp-token-123'),
      );

      await controller.login(
        { username: 'testuser', password: 'password123' },
        '127.0.0.1',
        'test-agent',
        mockResponse,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 401,
        message: "2FA verification required for user 'testuser'",
        data: {
          requires2FA: true,
          tempToken: 'temp-token-123',
        },
      });
    });
  });

  describe('refreshToken', () => {
    const mockResponse = {
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    it('should refresh token successfully', async () => {
      const mockUserDto = {
        id: 1,
        username: 'testuser',
        nickname: 'Test User',
        email: 'test@example.com',
      };

      mockSessionService.refreshSession.mockResolvedValue([
        'new-refresh-token',
        'access-token',
      ]);
      mockAuthService.decode.mockReturnValue({
        validUntil: Date.now() + 86400000,
        authorization: { userId: 1 },
      });
      mockUsersService.getUserDtoById.mockResolvedValue(mockUserDto);

      await controller.refreshToken(
        'REFRESH_TOKEN=old-refresh-token',
        mockResponse,
        '127.0.0.1',
        'test-agent',
      );

      expect(mockSessionService.refreshSession).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(mockUsersService.getUserDtoById).toHaveBeenCalledWith(
        1,
        1,
        '127.0.0.1',
        'test-agent',
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 201,
        message: 'Refresh token successfully.',
        data: {
          accessToken: 'access-token',
          user: mockUserDto,
        },
      });
    });

    it('should throw error when no cookie header', async () => {
      await expect(
        controller.refreshToken(
          undefined as any,
          mockResponse,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(AuthenticationRequiredError);
    });

    it('should throw error when no refresh token cookie', async () => {
      await expect(
        controller.refreshToken(
          'OTHER_COOKIE=value',
          mockResponse,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(AuthenticationRequiredError);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      const result = await controller.logout('REFRESH_TOKEN=refresh-token');

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        'refresh-token',
      );
      expect(result).toEqual({
        code: 201,
        message: 'Logout successfully.',
      });
    });

    it('should throw error when no cookie header', async () => {
      await expect(controller.logout(undefined as any)).rejects.toThrow(
        AuthenticationRequiredError,
      );
    });
  });

  describe('getUser', () => {
    it('should get user successfully', async () => {
      const mockUserDto = {
        id: 1,
        username: 'testuser',
        nickname: 'Test User',
        email: 'test@example.com',
      };

      mockUsersService.getUserDtoById.mockResolvedValue(mockUserDto);

      const result = await controller.getUser(
        1,
        'Bearer token',
        1,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toEqual({
        code: 200,
        message: 'Query user successfully.',
        data: {
          user: mockUserDto,
        },
      });
    });

    it('should throw error when user not found', async () => {
      mockUsersService.getUserDtoById.mockRejectedValue(
        new UserIdNotFoundError(999),
      );

      await expect(
        controller.getUser(999, 'Bearer token', 1, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UserIdNotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      mockUsersService.updateUserProfile.mockResolvedValue(undefined);

      const result = await controller.updateUser(
        1,
        { nickname: 'New Nickname', intro: 'New intro', avatarId: 2 },
        'Bearer token',
      );

      expect(mockUsersService.updateUserProfile).toHaveBeenCalledWith(
        1,
        'New Nickname',
        'New intro',
        2,
      );
      expect(result).toEqual({
        code: 200,
        message: 'Update user successfully.',
      });
    });
  });

  describe('followUser', () => {
    it('should follow user successfully', async () => {
      mockUsersService.addFollowRelationship.mockResolvedValue(undefined);

      const result = await controller.followUser(2, 'Bearer token', 1);

      expect(mockUsersService.addFollowRelationship).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual({
        code: 201,
        message: 'Follow user successfully.',
        data: {
          follow_count: 5,
        },
      });
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow user successfully', async () => {
      mockUsersService.deleteFollowRelationship.mockResolvedValue(undefined);

      const result = await controller.unfollowUser(2, 'Bearer token', 1);

      expect(mockUsersService.deleteFollowRelationship).toHaveBeenCalledWith(
        1,
        2,
      );
      expect(result).toEqual({
        code: 200,
        message: 'Unfollow user successfully.',
        data: {
          follow_count: 5,
        },
      });
    });
  });

  describe('Passkey methods', () => {
    describe('getPasskeyRegistrationOptions', () => {
      it('should get passkey registration options', async () => {
        const mockOptions = {
          challenge: 'test-challenge',
          rp: { name: 'Test RP', id: 'localhost' },
        };

        mockUsersService.generatePasskeyRegistrationOptions.mockResolvedValue(
          mockOptions,
        );

        const result = await controller.getPasskeyRegistrationOptions(
          1,
          'Bearer token',
        );

        expect(result).toEqual({
          code: 200,
          message: 'Generated registration options successfully.',
          data: {
            options: mockOptions,
          },
        });
      });
    });

    describe('verifyPasskeyRegistration', () => {
      it('should verify passkey registration successfully', async () => {
        const mockResponse = {
          id: 'cred-id',
          rawId: 'cred-id',
          response: {
            clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0',
            attestationObject: 'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjE',
          },
          type: 'public-key' as const,
          clientExtensionResults: {},
        };
        mockUsersService.verifyPasskeyRegistration.mockResolvedValue(undefined);

        const result = await controller.verifyPasskeyRegistration(
          1,
          { response: mockResponse },
          'Bearer token',
        );

        expect(result).toEqual({
          code: 201,
          message: 'Passkey registered successfully.',
        });
      });
    });

    describe('getUserPasskeys', () => {
      it('should get user passkeys', async () => {
        const mockPasskeys = [
          {
            id: 1,
            credentialId: 'cred-1',
            userId: 1,
            createdAt: new Date(),
            deviceType: 'cross-platform',
            backedUp: false,
          },
          {
            id: 2,
            credentialId: 'cred-2',
            userId: 1,
            createdAt: new Date(),
            deviceType: 'platform',
            backedUp: true,
          },
        ];

        mockUsersService.getUserPasskeys.mockResolvedValue(mockPasskeys);

        const result = await controller.getUserPasskeys(1, 'Bearer token');

        expect(result).toEqual({
          code: 200,
          message: 'Query passkeys successfully.',
          data: {
            passkeys: [
              {
                id: 'cred-1',
                createdAt: mockPasskeys[0].createdAt,
                deviceType: 'cross-platform',
                backedUp: false,
              },
              {
                id: 'cred-2',
                createdAt: mockPasskeys[1].createdAt,
                deviceType: 'platform',
                backedUp: true,
              },
            ],
          },
        });
      });
    });

    describe('deletePasskey', () => {
      it('should delete passkey successfully', async () => {
        mockUsersService.deletePasskey.mockResolvedValue(undefined);

        const result = await controller.deletePasskey(
          1,
          'cred-id',
          'Bearer token',
        );

        expect(result).toEqual({
          code: 200,
          message: 'Delete passkey successfully.',
        });
      });
    });
  });

  describe('getAuthMethods', () => {
    it('should get auth methods for user', async () => {
      const mockUser = {
        srpUpgraded: true,
        totpEnabled: true,
        totpAlwaysRequired: false,
      };

      mockUsersService.findUserRecordByUsernameOrThrow.mockResolvedValue(
        mockUser,
      );
      mockPrismaService.passkey.count.mockResolvedValue(1);

      const result = await controller.getAuthMethods('testuser');

      expect(result).toEqual({
        code: 200,
        message: 'Authentication methods retrieved successfully.',
        data: {
          supports_srp: true,
          supports_passkey: true,
          supports_2fa: true,
          requires_2fa: false,
        },
      });
    });

    it('should handle username not found gracefully', async () => {
      mockUsersService.findUserRecordByUsernameOrThrow.mockRejectedValue(
        new UsernameNotFoundError('nonexistent'),
      );

      const result = await controller.getAuthMethods('nonexistent');

      expect(result).toEqual({
        code: 200,
        message: 'User not found, no authentication methods available.',
        data: {
          supports_srp: false,
          supports_passkey: false,
          supports_2fa: false,
          requires_2fa: false,
        },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        1,
        { srpSalt: 'new-salt', srpVerifier: 'new-verifier' },
        'Bearer token',
      );

      expect(result).toEqual({
        code: 200,
        message: 'Password changed successfully',
      });
    });
  });

  describe('OAuth methods', () => {
    describe('getOAuthProviders', () => {
      it('should get OAuth providers', async () => {
        const mockProviders = [
          { id: 'google', name: 'Google' },
          { id: 'github', name: 'GitHub' },
        ];

        mockOAuthService.getProvidersConfig.mockResolvedValue(mockProviders);

        const result = await controller.getOAuthProviders();

        expect(result).toEqual({
          code: 200,
          message: 'Get OAuth providers successfully.',
          data: {
            providers: mockProviders,
          },
        });
      });
    });

    describe('oauthLogin', () => {
      it('should redirect to OAuth provider', async () => {
        const mockResponse = {
          redirect: jest.fn(),
        } as unknown as Response;

        mockOAuthService.generateAuthorizationUrl.mockResolvedValue(
          'https://oauth.provider/auth',
        );

        await controller.oauthLogin(
          'google',
          'test-state',
          'offline',
          mockResponse,
        );

        expect(mockResponse.redirect).toHaveBeenCalledWith(
          'https://oauth.provider/auth',
        );
      });
    });

    describe('getUserOAuthConnections', () => {
      it('should get user OAuth connections', async () => {
        const mockConnections = [
          {
            id: 1,
            providerId: 'google',
            providerName: 'Google',
            providerUserId: 'google123',
            connectedAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        mockUsersService.getUserOAuthConnections.mockResolvedValue(
          mockConnections,
        );

        const result = await controller.getUserOAuthConnections(
          1,
          'Bearer token',
        );

        expect(result).toEqual({
          code: 200,
          message: 'Get OAuth connections successfully.',
          data: {
            connections: mockConnections,
          },
        });
      });
    });

    describe('unbindOAuth', () => {
      it('should unbind OAuth connection successfully', async () => {
        mockUsersService.unbindOAuth.mockResolvedValue({
          success: true,
          unboundConnectionId: 1,
        });

        const result = await controller.unbindOAuth(1, 1, 'Bearer token');

        expect(result).toEqual({
          code: 200,
          message: 'OAuth connection unbound successfully.',
          data: {
            success: true,
            unboundConnectionId: 1,
          },
        });
      });
    });
  });

  describe('2FA methods', () => {
    describe('enable2FA', () => {
      it('should enable 2FA successfully', async () => {
        const mockResult = ['code1', 'code2'];
        const mockUser = { id: 1, username: 'testuser' };

        mockUsersService.findUserRecordOrThrow.mockResolvedValue(mockUser);
        mockTOTPService.enable2FA.mockResolvedValue(mockResult);

        const result = await controller.enable2FA(
          1,
          { code: '123456', secret: 'secret123' },
          'Bearer token',
        );

        expect(result).toEqual({
          code: 201,
          message: '2FA enabled successfully',
          data: {
            secret: 'secret123',
            otpauth_url: 'otpauth://totp/test',
            qrcode: expect.any(String),
            backup_codes: mockResult,
          },
        });
      });
    });

    describe('disable2FA', () => {
      it('should disable 2FA successfully', async () => {
        mockTOTPService.disable2FA.mockResolvedValue(undefined);

        const result = await controller.disable2FA(
          1,
          { code: '123456' },
          'Bearer token',
        );

        expect(result).toEqual({
          code: 200,
          message: '2FA disabled successfully',
          data: {
            success: true,
          },
        });
      });
    });

    describe('get2FAStatus', () => {
      it('should get 2FA status successfully', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          totpEnabled: true,
          totpAlwaysRequired: false,
          passkeys: [{ id: 1 }],
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await controller.get2FAStatus(1, 'Bearer token');

        expect(result).toEqual({
          code: 200,
          message: 'Get 2FA status successfully',
          data: {
            enabled: true,
            has_passkey: true,
            always_required: false,
          },
        });
      });
    });
  });

  describe('Resource owner getter', () => {
    it('should return user id as owner', async () => {
      const result = await controller.getUserOwner(123);
      expect(result).toBe(123);
    });
  });
});

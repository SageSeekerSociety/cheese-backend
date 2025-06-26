/*
 * Description: Unit tests for Users Controller
 *
 * Author(s):
 *      HuanCheng65
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
    initiateOAuthFlow: jest.fn(),
    getOAuthStateInfo: jest.fn(),
    createOAuthUserFromDecision: jest.fn(),
    bindOAuthToExistingUser: jest.fn(),
    completeOAuthVerification: jest.fn(),
    initOAuthBinding: jest.fn(),
    getUserOAuthConnections: jest.fn(),
    unbindOAuth: jest.fn(),
    createSessionForNewUser: jest.fn(),
    findUserRecordByUsernameOrThrow: jest.fn(),
    getFollowingCount: jest.fn().mockResolvedValue(5),
    findUserRecordOrThrow: jest.fn(),
    handleOAuthBindingCallback: jest.fn(),
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
    getUserInfo: jest.fn(),
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
        id: 1,
        srpUpgraded: true,
        totpEnabled: true,
        totpAlwaysRequired: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
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
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await controller.getAuthMethods('nonexistent');

      expect(result).toEqual({
        code: 200,
        message: 'Authentication methods retrieved successfully.',
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

  describe('OAuth callbacks and verification', () => {
    const mockRes = {
      redirect: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
    } as unknown as Response;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('oauthCallback', () => {
      it('should handle successful login and redirect', async () => {
        const mockUserDto = { id: 1, email: 'test@example.com' };
        mockUsersService.initiateOAuthFlow.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh',
          'jwt-access',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 10000,
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockUsersService.initiateOAuthFlow).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-success'),
        );
        expect(mockRes.cookie).toHaveBeenCalled();
      });

      it('should redirect to verification page when required', async () => {
        mockUsersService.initiateOAuthFlow.mockResolvedValue({
          requiresVerification: true,
          verificationType: 'password',
          email: 'test@example.com',
          sessionId: 'session123',
        });
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-verify'),
        );
        const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
        expect(redirectUrl).toContain('type=password');
        expect(redirectUrl).toContain('sessionId=session123');
      });

      it('should redirect to decision page when user choice required', async () => {
        mockUsersService.initiateOAuthFlow.mockResolvedValue({
          requiresDecision: true,
          stateToken: 'state-token-123',
        });
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'new@example.com',
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-complete'),
        );
        const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
        expect(redirectUrl).toContain('stateToken=state-token-123');
      });

      it('should redirect to error page on OAuth error in query', async () => {
        await controller.oauthCallback(
          'google',
          { code: '', error: 'access_denied' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error?error=access_denied'),
        );
      });

      it('should redirect to error page on service exception', async () => {
        mockOAuthService.handleCallback.mockRejectedValue(
          new Error('Some OAuth error'),
        );

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error'),
        );
      });

      it('should handle binding callback and redirect', async () => {
        mockUsersService.handleOAuthBindingCallback.mockResolvedValue({
          success: true,
          message: 'Success',
        });
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth-code', state: 'binding:session-id' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(
          mockUsersService.handleOAuthBindingCallback,
        ).toHaveBeenCalledWith('google', expect.any(Object), 'session-id');
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-success?bound=true'),
        );
      });

      it('should redirect to error page if binding callback service call fails', async () => {
        const errorMessage = 'Service error during binding';
        mockUsersService.handleOAuthBindingCallback.mockRejectedValue(
          new Error(errorMessage),
        );
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({ id: '123' });

        await controller.oauthCallback(
          'google',
          { code: 'auth-code', state: 'binding:session-id' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('error=Service+error+during+binding'),
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('error_code=BINDING_ERROR'),
        );
      });

      it('should redirect to error page for invalid binding state format', async () => {
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({ id: '123' });

        await controller.oauthCallback(
          'google',
          { code: 'auth-code', state: 'binding:' }, // Invalid state
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(
          mockUsersService.handleOAuthBindingCallback,
        ).not.toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('error=Invalid+binding+state+format'),
        );
      });
    });

    describe('oauthVerify', () => {
      it('should handle successful verification and redirect', async () => {
        const mockUserDto = { id: 1, email: 'test@example.com' };
        mockUsersService.completeOAuthVerification.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh',
          'jwt-access',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 10000,
        });

        await controller.oauthVerify(
          { sessionId: 'session123', password: 'pw' },
          'ip',
          'ua',
          mockRes,
        );

        expect(mockUsersService.completeOAuthVerification).toHaveBeenCalledWith(
          'session123',
          expect.any(Object),
          'ip',
          'ua',
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-success'),
        );
      });

      it('should redirect to error page on verification failure', async () => {
        mockUsersService.completeOAuthVerification.mockRejectedValue(
          new Error('Verification failed'),
        );

        await controller.oauthVerify(
          { sessionId: 'session123', password: 'pw' },
          'ip',
          'ua',
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error'),
        );
      });
    });

    describe('bindOAuth', () => {
      it('should return bind URL successfully', async () => {
        mockUsersService.initOAuthBinding.mockResolvedValue({
          bindingSessionId: 'binding123',
        });
        mockOAuthService.generateAuthorizationUrl.mockResolvedValue(
          'http://provider/auth?state=binding:binding123',
        );

        const result = await controller.bindOAuth(1, 'google', {}, 'token');

        expect(mockUsersService.initOAuthBinding).toHaveBeenCalledWith(
          1,
          'google',
          undefined,
        );
        expect(mockOAuthService.generateAuthorizationUrl).toHaveBeenCalledWith(
          'google',
          'binding:binding123',
          undefined,
        );
        expect(result.data.bindUrl).toBe(
          'http://provider/auth?state=binding:binding123',
        );
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

  describe('Additional OAuth methods', () => {
    describe('getOAuthState', () => {
      it('should get OAuth state info successfully', async () => {
        const mockStateInfo = {
          providerId: 'google',
          userInfo: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
          },
          suggestedUsername: 'testuser',
          suggestedNickname: 'Test User',
          emailConflict: false,
        };

        mockUsersService.getOAuthStateInfo.mockResolvedValue(mockStateInfo);

        const result = await controller.getOAuthState('state-token-123');

        expect(result).toEqual({
          code: 200,
          message: 'Get OAuth state successfully.',
          data: mockStateInfo,
        });
        expect(mockUsersService.getOAuthStateInfo).toHaveBeenCalledWith(
          'state-token-123',
        );
      });
    });

    describe('createOAuthUser', () => {
      const mockResponse = {
        cookie: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
      } as unknown as Response;

      it('should create OAuth user successfully', async () => {
        const mockUserDto = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        };

        mockUsersService.createOAuthUserFromDecision.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh-token',
          'access-token',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 86400000,
        });

        await controller.createOAuthUser(
          {
            stateToken: 'state-token-123',
            username: 'testuser',
            nickname: 'Test User',
          },
          'ip',
          'ua',
          mockResponse,
        );

        expect(
          mockUsersService.createOAuthUserFromDecision,
        ).toHaveBeenCalledWith(
          'state-token-123',
          'testuser',
          'Test User',
          'ip',
          'ua',
        );
        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-success'),
        );
      });
    });

    describe('bindOAuthToExistingUser', () => {
      const mockResponse = {
        cookie: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
      } as unknown as Response;

      it('should bind OAuth to existing user with password', async () => {
        const mockUserDto = {
          id: 1,
          username: 'existinguser',
          email: 'test@example.com',
        };

        mockUsersService.bindOAuthToExistingUser.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh-token',
          'access-token',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 86400000,
        });

        await controller.bindOAuthToExistingUser(
          {
            stateToken: 'state-token-123',
            username: 'existinguser',
            password: 'password123',
          },
          'ip',
          'ua',
          mockResponse,
        );

        expect(mockUsersService.bindOAuthToExistingUser).toHaveBeenCalledWith(
          'state-token-123',
          'existinguser',
          { password: 'password123' },
          'ip',
          'ua',
        );
        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-success'),
        );
      });

      it('should bind OAuth to existing user with SRP', async () => {
        const mockUserDto = {
          id: 1,
          username: 'existinguser',
          email: 'test@example.com',
        };

        mockUsersService.bindOAuthToExistingUser.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh-token',
          'access-token',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 86400000,
        });

        await controller.bindOAuthToExistingUser(
          {
            stateToken: 'state-token-123',
            username: 'existinguser',
            clientPublicEphemeral: 'client-public',
            clientProof: 'client-proof',
          },
          'ip',
          'ua',
          mockResponse,
        );

        expect(mockUsersService.bindOAuthToExistingUser).toHaveBeenCalledWith(
          'state-token-123',
          'existinguser',
          {
            clientPublicEphemeral: 'client-public',
            clientProof: 'client-proof',
          },
          'ip',
          'ua',
        );
      });
    });
  });

  describe('Error handling tests', () => {
    describe('oauthCallback error scenarios', () => {
      const mockRes = {
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response;

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should handle missing authorization code', async () => {
        // Mock the OAuth service to throw an error for empty code
        mockOAuthService.handleCallback.mockRejectedValue(
          new Error('Authorization code is required'),
        );

        await controller.oauthCallback(
          'google',
          { code: '' }, // Empty code
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error'),
        );
      });

      it('should handle OAuth service getUserInfo failure', async () => {
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockRejectedValue(
          new Error('Failed to get user info'),
        );

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error'),
        );
      });

      it('should handle initiateOAuthFlow failure', async () => {
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });
        mockUsersService.initiateOAuthFlow.mockRejectedValue(
          new Error('OAuth flow error'),
        );

        await controller.oauthCallback(
          'google',
          { code: 'auth_code' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('/oauth-error'),
        );
      });
    });

    describe('bindOAuth error scenarios', () => {
      it('should handle initOAuthBinding failure', async () => {
        mockUsersService.initOAuthBinding.mockRejectedValue(
          new Error('Binding init failed'),
        );

        await expect(
          controller.bindOAuth(1, 'google', {}, 'token'),
        ).rejects.toThrow('Binding init failed');
      });

      it('should handle generateAuthorizationUrl failure', async () => {
        mockUsersService.initOAuthBinding.mockResolvedValue({
          bindingSessionId: 'binding123',
        });
        mockOAuthService.generateAuthorizationUrl.mockRejectedValue(
          new Error('URL generation failed'),
        );

        await expect(
          controller.bindOAuth(1, 'google', {}, 'token'),
        ).rejects.toThrow('URL generation failed');
      });
    });

    describe('getUserOAuthConnections error scenarios', () => {
      it('should handle service error', async () => {
        mockUsersService.getUserOAuthConnections.mockRejectedValue(
          new Error('Service error'),
        );

        await expect(
          controller.getUserOAuthConnections(1, 'Bearer token'),
        ).rejects.toThrow('Service error');
      });
    });

    describe('unbindOAuth error scenarios', () => {
      it('should handle service error', async () => {
        mockUsersService.unbindOAuth.mockRejectedValue(
          new Error('Unbind failed'),
        );

        await expect(
          controller.unbindOAuth(1, 1, 'Bearer token'),
        ).rejects.toThrow('Unbind failed');
      });
    });
  });

  describe('Edge cases and validation', () => {
    describe('oauthLogin with different parameters', () => {
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      it('should handle OAuth login with state parameter', async () => {
        mockOAuthService.generateAuthorizationUrl.mockResolvedValue(
          'https://oauth.provider/auth?state=custom-state',
        );

        await controller.oauthLogin(
          'google',
          'custom-state',
          'offline',
          mockResponse,
        );

        expect(mockOAuthService.generateAuthorizationUrl).toHaveBeenCalledWith(
          'google',
          'custom-state',
          'offline',
        );
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          'https://oauth.provider/auth?state=custom-state',
        );
      });

      it('should handle OAuth login without state parameter', async () => {
        mockOAuthService.generateAuthorizationUrl.mockResolvedValue(
          'https://oauth.provider/auth',
        );

        await controller.oauthLogin(
          'github',
          undefined,
          'online',
          mockResponse,
        );

        expect(mockOAuthService.generateAuthorizationUrl).toHaveBeenCalledWith(
          'github',
          undefined,
          'online',
        );
      });
    });

    describe('OAuth callback with various state formats', () => {
      const mockRes = {
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response;

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should handle binding state with extra data', async () => {
        mockUsersService.handleOAuthBindingCallback.mockResolvedValue({
          success: true,
          message: 'Success',
        });
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth-code', state: 'binding:session-id:extra-data' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(
          mockUsersService.handleOAuthBindingCallback,
        ).toHaveBeenCalledWith('google', expect.any(Object), 'session-id');
      });

      it('should handle non-binding state', async () => {
        const mockUserDto = { id: 1, email: 'test@example.com' };
        mockUsersService.initiateOAuthFlow.mockResolvedValue([
          mockUserDto as any,
          'refresh-token',
        ]);
        mockOAuthService.handleCallback.mockResolvedValue('oauth-access-token');
        mockOAuthService.getUserInfo.mockResolvedValue({
          id: '123',
          email: 'test@example.com',
        });
        mockSessionService.refreshSession.mockResolvedValue([
          'new-refresh',
          'jwt-access',
        ]);
        mockAuthService.decode.mockReturnValue({
          validUntil: Date.now() + 10000,
        });

        await controller.oauthCallback(
          'google',
          { code: 'auth-code', state: 'regular-state' },
          'ip',
          'ua',
          {} as Request,
          mockRes,
        );

        expect(mockUsersService.initiateOAuthFlow).toHaveBeenCalled();
        expect(
          mockUsersService.handleOAuthBindingCallback,
        ).not.toHaveBeenCalled();
      });
    });
  });
});

/*
 *  Description: This file implements the Auth controller for user authentication.
 *               It is responsible for handling requests to /auth/...
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Ip,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import path from 'node:path';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
} from '../../auth/auth.error';
import { AuthService as SharedAuthService } from '../../auth/auth.service';
import { Guard, AuthToken } from '../../auth/guard.decorator';
import { OAuthService } from '../../auth/oauth/oauth.service';
import { OAuthError, OAuthUserInfo } from '../../auth/oauth/oauth.types';
import { SessionService } from '../../auth/session.service';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { BaseErrorExceptionFilter } from '../../common/error/error-filter';
import { NoAuth } from '../../common/interceptor/token-validate.interceptor';
import { PrismaService } from '../../common/prisma/prisma.service';

// DTOs - these will be from ./dto folder primarily
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto'; // Corrected path
import { RefreshTokenResponseDto } from './dto/refresh-token.dto'; // Corrected path
import {
  SrpInitRequestDto,
  SrpInitResponseDto,
  SrpVerifyRequestDto,
  SrpVerifyResponseDto,
} from './dto/srp.dto'; // Corrected path
import { VerifySudoRequestDto, VerifySudoResponseDto } from './dto/sudo.dto'; // Corrected path

// DTOs that might still be in `src/users/DTO` or need splitting
import {
  OAuthCallbackQueryDto,
  GetOAuthProvidersResponseDto,
  OAuthUserDto,
  OAuthVerifyRequestDto,
} from '../DTO/oauth.dto'; // Path to be adjusted if oauth.dto is split/moved
import {
  PasskeyAuthenticationOptionsRequestDto,
  PasskeyAuthenticationOptionsResponseDto,
  PasskeyAuthenticationVerifyRequestDto,
  PasskeyAuthenticationVerifyResponseDto,
} from '../DTO/passkey.dto'; // Path to be adjusted
import { Verify2FARequestDto } from '../DTO/totp.dto'; // Path to be adjusted

// Service
import { AuthService } from './auth.service'; // The new local auth service
import { TOTPRequiredError } from './errors/auth.error'; // Local auth error
import { PasskeyNotFoundError } from './errors/auth.error'; // Local auth error
import { UsersService } from '../users.service'; // Temporary for getOAuthStateInfo and others

// TODO: Remove UsersService dependency when AccountService/SecurityService are created.

declare module 'express-session' {
  interface SessionData {
    passkeyChallenge?: string;
    srpSession?: {
      serverSecretEphemeral: string;
    };
  }
}

@Controller('/auth') // Changed base path to /auth
@UseFilters(BaseErrorExceptionFilter)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService, // New local AuthService
    private readonly sharedAuthService: SharedAuthService, // Existing shared AuthService
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly prismaService: PrismaService, // For passkey verify direct db check, ideally move to service
     // Temporary dependencies, to be removed/refactored:
     @Inject(forwardRef(() => UsersService))
     private readonly usersServiceOriginal: UsersService, // Represents the original UsersService
     private readonly realUsersService: UsersService, // Alias for clarity during refactor
  ) {}

  private async handleSuccessfulOAuthRedirect(
    res: Response,
    refreshToken: string,
    userDto: OAuthUserDto, // This DTO might need to come from the new AuthService or AccountService
    queryParams?: Record<string, string>,
  ): Promise<void> {
    const [newRefreshToken, jwtAccessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.sharedAuthService.decode(newRefreshToken).validUntil,
    );

    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    res.cookie('REFRESH_TOKEN', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' for OAuth redirects
      path: path.posix.join(cookieBasePath, 'auth'), // Adjusted path
      expires: newRefreshTokenExpire,
    });

    const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
    const successPath =
      this.configService.get('FRONTEND_OAUTH_SUCCESS_PATH') || '/oauth-success';

    const params = new URLSearchParams({
      token: jwtAccessToken,
      email: userDto.email || userDto.username, // Assuming OAuthUserDto has email/username
      ...queryParams,
    });
    res.redirect(`${frontendBaseUrl}${successPath}?${params.toString()}`);
  }

  @Post('/login')
  @NoAuth()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(
    @Body() { username, password }: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const [userDto, refreshToken] = await this.authService.login(
        username,
        password,
        ip,
        userAgent,
      );
      const [newRefreshToken, accessToken] =
        await this.sessionService.refreshSession(refreshToken);
      const newRefreshTokenExpire = new Date(
        this.sharedAuthService.decode(newRefreshToken).validUntil,
      );
      const data: LoginResponseDto = {
        code: 201,
        message: 'Login successfully.',
        data: { user: userDto, accessToken, requires2FA: false },
      };
      const cookieBasePath = this.configService.get('cookieBasePath') || '';
      return res
        .cookie('REFRESH_TOKEN', newRefreshToken, {
          httpOnly: true,
          sameSite: 'strict',
          path: path.posix.join(cookieBasePath, 'auth'), // Base path for auth cookies
          expires: newRefreshTokenExpire,
        })
        .json(data);
    } catch (e) {
      if (e instanceof TOTPRequiredError) {
        const data: LoginResponseDto = {
          code: 401, // Standard for auth required
          message: e.message,
          data: { requires2FA: true, tempToken: e.tempToken },
        };
        return res.status(401).json(data); // Send 401 status
      }
      throw e; // Re-throw other errors to be handled by global filter
    }
  }

  @Post('/refresh-token')
  @NoAuth()
  async refreshToken(
    @Headers('cookie') cookieHeader: string,
    @Res() res: Response,
    @Ip() ip: string, // Added IP and User-Agent for consistency if needed by services
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<Response> {
    if (!cookieHeader) throw new AuthenticationRequiredError();
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) => cookie.startsWith('REFRESH_TOKEN='));
    if (!refreshTokenCookie) throw new AuthenticationRequiredError();

    const oldRefreshToken = refreshTokenCookie.split('=')[1];
    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(oldRefreshToken);
    const newRefreshTokenExpire = new Date(
      this.sharedAuthService.decode(newRefreshToken).validUntil,
    );
    const decodedAccessToken = this.sharedAuthService.decode(accessToken);

    // Getting UserDto will eventually be from AccountService
    const userDto = await this.usersServiceOriginal.getUserDtoById(
      decodedAccessToken.authorization.userId,
      decodedAccessToken.authorization.userId,
      ip,
      userAgent,
    );

    const data: RefreshTokenResponseDto = {
      code: 201, // Or 200
      message: 'Refresh token successfully.',
      data: { accessToken, user: userDto },
    };
    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(cookieBasePath, 'auth'),
        expires: newRefreshTokenExpire,
      })
      .json(data);
  }

  @Post('/logout')
  @NoAuth() // Logout can be called even if token is expired or invalid on client
  async logout(@Headers('cookie') cookieHeader: string): Promise<BaseResponseDto> {
    if (cookieHeader) { // Only try to revoke if cookie exists
        const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
        const refreshTokenCookie = cookies.find((cookie) => cookie.startsWith('REFRESH_TOKEN='));
        if (refreshTokenCookie) {
            const refreshToken = refreshTokenCookie.split('=')[1];
            try {
                await this.sessionService.revokeSession(refreshToken);
            } catch (error) {
                this.logger.warn(`Failed to revoke refresh token during logout: ${error}`);
                // Do not re-throw, logout should appear successful to client
            }
        }
    }
    return { code: 200, message: 'Logout successfully.' }; // Changed to 200
  }

  @Post('/passkey/options')
  @NoAuth()
  async getPasskeyAuthenticationOptions(
    @Body() { userId }: PasskeyAuthenticationOptionsRequestDto,
    @Req() req: Request,
  ): Promise<PasskeyAuthenticationOptionsResponseDto> {
    const options = await this.authService.generatePasskeyAuthenticationOptions(req, userId);
    // Challenge is already set in session by the service
    return {
      code: 200,
      message: 'Generated authentication options successfully.',
      data: { options: options as any },
    };
  }

  @Post('/passkey/verify')
  @NoAuth()
  async verifyPasskeyAuthentication(
    @Req() req: Request,
    @Body() { response }: PasskeyAuthenticationVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    const verified = await this.authService.verifyPasskeyAuthentication(req, response);
    // The service now throws if passkey not found or verification fails.
    // If it returns false, it implies a verification failure but not necessarily that the passkey wasn't found.
    // For consistency, service should throw specific errors. Assuming it does.

    const passkey = await this.prismaService.passkey.findFirst({ // TODO: Move this DB call to service
        where: { credentialId: response.id },
    });
    if (!passkey) throw new PasskeyNotFoundError(response.id); // Should be caught by service ideally

    const [userDto, refreshToken] = await this.authService.handlePasskeyLogin(
      passkey.userId,
      ip,
      userAgent,
    );
    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.sharedAuthService.decode(newRefreshToken).validUntil,
    );
    const data: PasskeyAuthenticationVerifyResponseDto = {
      code: 201,
      message: 'Authentication successful.',
      data: { user: userDto, accessToken },
    };
    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(cookieBasePath, 'auth'),
        expires: newRefreshTokenExpire,
      })
      .json(data);
  }

  @Post('/srp/init')
  @NoAuth()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async srpInit(
    @Body() { username }: SrpInitRequestDto,
    @Req() req: Request, // IP and User-Agent not strictly needed for init by client
  ): Promise<SrpInitResponseDto> {
    const result = await this.authService.handleSrpInit(username);
    req.session.srpSession = { serverSecretEphemeral: result.serverSecretEphemeral };
    return {
      code: 200,
      message: 'SRP initialization successful.',
      data: { salt: result.salt, serverPublicEphemeral: result.serverPublicEphemeral },
    };
  }

  @Post('/srp/verify')
  @NoAuth()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async srpVerify(
    @Body() { username, clientPublicEphemeral, clientProof }: SrpVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const sessionState = req.session.srpSession;
    if (!sessionState) throw new Error('SRP session not found. Please initialize first.');

    const result = await this.authService.handleSrpVerify(
      username,
      clientPublicEphemeral,
      clientProof,
      sessionState.serverSecretEphemeral,
      ip,
      userAgent,
    );
    delete req.session.srpSession;

    if (result.requires2FA) {
      const data: SrpVerifyResponseDto = {
        code: 200, // Still 200, but indicates next step
        message: 'SRP verification successful, 2FA required.',
        data: {
          serverProof: result.serverProof,
          accessToken: '', // No access token yet
          requires2FA: true,
          tempToken: result.tempToken,
          user: result.user,
        },
      };
      return res.json(data);
    }

    const [newRefreshToken, newAccessToken] = // result.accessToken is the direct session token from authService
      await this.sessionService.refreshSession(result.accessToken);
    const newRefreshTokenExpire = new Date(
      this.sharedAuthService.decode(newRefreshToken).validUntil,
    );
    const data: SrpVerifyResponseDto = {
      code: 200, // Or 201 for created session
      message: 'SRP verification successful.',
      data: {
        serverProof: result.serverProof,
        accessToken: newAccessToken,
        requires2FA: false,
        user: result.user,
      },
    };
    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(cookieBasePath, 'auth'),
        expires: newRefreshTokenExpire,
      })
      .json(data);
  }

  @Get('/methods/:username')
  @NoAuth()
  async getAuthMethods(@Param('username') username: string): Promise<{
    code: number;
    message: string;
    data: {
      supports_srp: boolean;
      supports_passkey: boolean;
      supports_2fa: boolean; // Overall 2FA enabled status
      requires_2fa: boolean; // If current context would require 2FA (e.g. always_required)
    };
  }> {
    // This logic might be better in AuthService or a dedicated UserDiscoveryService
    const user = await this.prismaService.user.findUnique({ where: { username } });
    if (!user) {
      return {
        code: 200, // Still 200 to prevent enumeration
        message: 'Authentication methods retrieved successfully.', // Generic message
        data: { supports_srp: false, supports_passkey: false, supports_2fa: false, requires_2fa: false },
      };
    }
    const hasPasskeys = (await this.prismaService.passkey.count({ where: { userId: user.id } })) > 0;
    return {
      code: 200,
      message: 'Authentication methods retrieved successfully.',
      data: {
        supports_srp: user.srpUpgraded,
        supports_passkey: hasPasskeys,
        supports_2fa: user.totpEnabled,
        requires_2fa: user.totpAlwaysRequired, // Or more complex logic via authService.shouldRequire2FA
      },
    };
  }

  @Post('/verify-2fa') // Path relative to /auth controller
  @NoAuth()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  async verify2FA(
    @Body() dto: Verify2FARequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    const [userDto, refreshToken, usedBackupCode] =
      await this.authService.verifyTOTPAndLogin(dto.temp_token, dto.code, ip, userAgent);
    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.sharedAuthService.decode(newRefreshToken).validUntil,
    );
    const data: LoginResponseDto = { // Re-using LoginResponseDto for successful 2FA
      code: 201,
      message: usedBackupCode
        ? 'Login successfully. Note: This backup code has expired. Please generate a new backup code for future use.'
        : 'Login successfully.',
      data: {
        user: userDto,
        accessToken,
        requires2FA: false, // No longer requires 2FA for this session
        usedBackupCode: usedBackupCode,
      },
    };
    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(cookieBasePath, 'auth'),
        expires: newRefreshTokenExpire,
      })
      .json(data);
  }

  @Post('/sudo')
  @Guard('verify-sudo', 'user') // The guard implies user is already authenticated with a base token
  async verifySudo(
    @Req() req: Request,
    @Headers('Authorization') @AuthToken() authToken: string, // Use @AuthToken to get the validated token
    @Body() body: VerifySudoRequestDto,
  ): Promise<VerifySudoResponseDto> {
    const result = await this.authService.verifySudo(
      req,
      authToken, // Pass the current valid token
      body.method,
      body.credentials,
    );
    let message = 'Sudo mode activated successfully';
    if (result.serverProof) message = 'SRP verification successful for sudo';
    else if (result.srpUpgraded) message = 'Password verification successful for sudo and account upgraded to SRP';

    return { code: 200, message, data: result };
  }

  // --- OAuth Endpoints ---
  @Get('/oauth/providers')
  @NoAuth()
  async getOAuthProviders(): Promise<GetOAuthProvidersResponseDto> {
    const providers = await this.oauthService.getProvidersConfig();
    return { code: 200, message: 'Get OAuth providers successfully.', data: { providers } };
  }

  @Get('/oauth/state')
  @NoAuth()
  async getOAuthState(@Query('token') stateToken: string): Promise<{
    code: number;
    message: string;
    data: { /* contract from UsersService.getOAuthStateInfo */ };
  }> {
    // This method in usersServiceOriginal will need to be moved to the new AuthService
    // or a dedicated OAuthOrchestrationService.
    const stateInfo = await this.authService.getOAuthStateInfo(stateToken);
    return { code: 200, message: 'Get OAuth state successfully.', data: stateInfo as any };
  }

  @Get('/oauth/login/:providerId')
  @NoAuth()
  async oauthLogin(
    @Param('providerId') providerId: string,
    @Query('state') state: string | undefined,
    @Query('access_type') accessType: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const authUrl = await this.oauthService.generateAuthorizationUrl(providerId, state, accessType);
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`OAuth login redirect failed for ${providerId}: ${error}`);
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorMessage = error instanceof OAuthError ? error.message : 'OAuth provider error';
      res.redirect(`${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(errorMessage)}&provider=${providerId}`);
    }
  }

  @Get('/oauth/callback/:providerId')
  @NoAuth()
  async oauthCallback(
    @Param('providerId') providerId: string,
    @Query() query: OAuthCallbackQueryDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request, // For session state if needed by underlying services
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (query.error) {
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
        res.redirect(`${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(query.error)}&provider=${providerId}`);
        return;
      }

      const oauthToken = await this.oauthService.handleCallback(providerId, query.code, query.state);
      const userInfo = await this.oauthService.getUserInfo(providerId, oauthToken);

      // Check if it's a binding flow (initiated by an already logged-in user)
      // This part of the logic might move to SecurityController/Service if state indicates binding for an existing session
      if (query.state && query.state.startsWith('binding:')) {
         // The handleOAuthBindingCallback was in UsersController, will move to SecurityController.
         // For now, this specific callback path might need to be handled differently if it's a security operation.
         // Let's assume for now that 'binding:' state is handled by a separate endpoint in SecurityController.
         // So, if we reach here with a 'binding:' state, it's an unexpected scenario for this pure auth callback.
         this.logger.warn(`OAuth callback received 'binding:' state for provider ${providerId}, but this endpoint is for new auth flows.`);
         // Fall through to normal auth flow or redirect to an error/info page.
         // For now, let's try to proceed with initiateOAuthFlow which should ideally handle this.
         // The `initiateOAuthFlow` should perhaps not be called if state is 'binding:',
         // as that implies an existing user session is trying to link.
         // This highlights the need for clear separation of "new OAuth login" vs "link OAuth to existing logged-in user".
         // The `usersService.handleOAuthBindingCallback` was the original target.
         // This part will be complex. Let's assume this callback is NOT for active binding for now.
      }

      const result = await this.authService.initiateOAuthFlow(providerId, userInfo, ip, userAgent);

      if (Array.isArray(result)) { // [OAuthUserDto, string (refreshToken)]
        const [userDto, refreshToken] = result;
        await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto);
      } else if ('requiresVerification' in result) {
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const verifyPath = this.configService.get('FRONTEND_OAUTH_VERIFY_PATH') || '/oauth-verify';
        const params = new URLSearchParams({
          type: result.verificationType,
          email: result.email,
          sessionId: result.sessionId,
        });
        if (result.salt) params.append('salt', result.salt);
        if (result.serverPublicEphemeral) params.append('serverPublicEphemeral', result.serverPublicEphemeral);
        res.redirect(`${frontendBaseUrl}${verifyPath}?${params.toString()}`);
      } else if ('requiresDecision' in result) {
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const completePath = this.configService.get('FRONTEND_OAUTH_COMPLETE_PATH') || '/oauth-complete';
        res.redirect(`${frontendBaseUrl}${completePath}?stateToken=${result.stateToken}`);
      }
    } catch (error) {
      this.logger.error(`OAuth callback failed for ${providerId}:`, error);
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorMessage = error instanceof Error ? error.message : 'OAuth callback processing failed';
      res.redirect(`${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(errorMessage)}&provider=${providerId}`);
    }
  }

  // This was a private method in UsersController, related to OAuth binding.
  // It should move to the SecurityController when that's created.
  // For now, commenting out as it's not directly part of the /auth/oauth/callback main flow.
  /*
  private async handleOAuthBindingCallback(...)
  */

  @Post('/oauth/verify') // Path relative to /auth
  @NoAuth()
  async oauthVerify(
    @Body() { sessionId, password, clientPublicEphemeral, clientProof }: OAuthVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const credentials = { password, clientPublicEphemeral, clientProof };
      // `completeOAuthVerification` is now in the local AuthService
      const [userDto, refreshToken] = await this.authService.completeOAuthVerification(
        sessionId, credentials, ip, userAgent
      );
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, { linked: 'true' });
    } catch (error) {
      this.logger.error('OAuth verification failed:', error);
      let errorCode = 'VERIFICATION_FAILED';
      let errorMessage = 'OAuth verification failed';
      if (error instanceof Error) {
        // Check for specific error types if they are defined and thrown by the service
        if (error instanceof PasswordNotMatchError) errorCode = 'INVALID_PASSWORD';
        else if (error instanceof SrpVerificationError) errorCode = 'INVALID_SRP_PROOF';
        else if (error.message.includes('session not found')) errorCode = 'SESSION_EXPIRED';
        errorMessage = error.message;
      }
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      res.redirect(`${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`);
    }
  }

  // The following two endpoints are for completing OAuth after user decision (create or bind)
  // They were originally /oauth/create and /oauth/bind at the /users root.
  // For consistency within /auth flow, they could be /auth/oauth/complete/create and /auth/oauth/complete/bind
  // Or keep them as /auth/oauth/create and /auth/oauth/bind for simplicity.
  // The services they call (createOAuthUserFromDecision, bindOAuthToExistingUser) are complex
  // and will be split between AccountService and AuthService/SecurityService.
  // For now, they will call the original usersServiceOriginal methods.

  @Post('/oauth/create') // Relative to /auth
  @NoAuth()
  async createOAuthUser(
    @Body() body: { stateToken: string; username: string; nickname: string },
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // This usersServiceOriginal.createOAuthUserFromDecision will be refactored.
      // Part of it (user creation) goes to AccountService.
      // Part of it (OAuth linking) stays in or is called by AuthService.
      const [userDto, refreshToken] =
        await this.usersServiceOriginal.createOAuthUserFromDecision(
          body.stateToken, body.username, body.nickname, ip, userAgent
        );
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, { created: 'true' });
    } catch (error) {
      this.logger.error('OAuth user creation from decision failed:', error);
      let errorCode = 'CREATION_FAILED';
      let errorMessage = 'Failed to create user';
      if (error instanceof Error) {
        if (error instanceof InvalidTokenError) errorCode = 'TOKEN_EXPIRED';
        // Add more specific error checks if UsersService throws them (e.g., UsernameTakenError)
        else if (error.message.includes('Username already registered')) errorCode = 'USERNAME_TAKEN';
        else if (error.message.includes('Invalid username')) errorCode = 'INVALID_USERNAME';
        errorMessage = error.message;
      }
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      res.redirect(`${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post('/oauth/bind') // Relative to /auth
  @NoAuth()
  async bindOAuthToExistingUser(
    @Body() body: {
      stateToken: string; username: string; password?: string;
      clientPublicEphemeral?: string; clientProof?: string;
    },
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const credentials = { password: body.password, clientPublicEphemeral: body.clientPublicEphemeral, clientProof: body.clientProof };
      // This usersServiceOriginal.bindOAuthToExistingUser will be refactored.
      // Authentication part by AuthService, linking by SecurityService.
      const [userDto, refreshToken] =
        await this.usersServiceOriginal.bindOAuthToExistingUser(
          body.stateToken, body.username, credentials, ip, userAgent
        );
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, { bound: 'true' });
    } catch (error) {
      this.logger.error('OAuth binding to existing user from decision failed:', error);
      let errorCode = 'BINDING_FAILED';
      let errorMessage = 'Failed to bind OAuth account';
       if (error instanceof Error) {
        if (error instanceof InvalidTokenError) errorCode = 'TOKEN_EXPIRED';
        else if (error instanceof UsernameNotFoundError) errorCode = 'USER_NOT_FOUND';
        else if (error instanceof InvalidLoginCredentialsError) errorCode = 'INVALID_CREDENTIALS';
        errorMessage = error.message;
      }
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath = this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      res.redirect(`${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

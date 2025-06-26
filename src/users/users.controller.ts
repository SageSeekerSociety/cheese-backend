/*
 *  Description: This file implements the users controller.
 *               It is responsible for handling the requests to /users/...
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Headers,
  HttpCode,
  Inject,
  Ip,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import path from 'node:path';
import qrcode from 'qrcode';
import { AnswerService } from '../answer/answer.service';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
} from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import {
  AuthToken,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';
import { OAuthService } from '../auth/oauth/oauth.service';
import { OAuthError, OAuthUserInfo } from '../auth/oauth/oauth.types';
import { SessionService } from '../auth/session.service';
import { UserId } from '../auth/user-id.decorator';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { PageDto } from '../common/DTO/page.dto';
import { NoAuth } from '../common/interceptor/token-validate.interceptor';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import {
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
} from './DTO/change-password.dto';
import {
  FollowResponseDto,
  UnfollowResponseDto,
} from './DTO/follow-unfollow.dto';
import { GetAnsweredAnswersResponseDto } from './DTO/get-answered-answers.dto';
import { GetAskedQuestionsResponseDto } from './DTO/get-asked-questions.dto';
import { GetFollowedQuestionsResponseDto } from './DTO/get-followed-questions.dto';
import { GetFollowersResponseDto } from './DTO/get-followers.dto';
import { GetUserResponseDto } from './DTO/get-user.dto';
import { LoginRequestDto, LoginResponseDto } from './DTO/login.dto';
import {
  GetOAuthProvidersResponseDto,
  GetUserOAuthConnectionsResponseDto,
  OAuthBindRequestDto,
  OAuthBindResponseDto,
  OAuthCallbackQueryDto,
  OAuthUserDto,
  OAuthVerifyRequestDto,
  UnbindOAuthResponseDto,
} from './DTO/oauth.dto';
import {
  DeletePasskeyResponseDto,
  GetPasskeysResponseDto,
  PasskeyAuthenticationOptionsRequestDto,
  PasskeyAuthenticationOptionsResponseDto,
  PasskeyAuthenticationVerifyRequestDto,
  PasskeyAuthenticationVerifyResponseDto,
  PasskeyRegistrationOptionsResponseDto,
  PasskeyRegistrationVerifyRequestDto,
  PasskeyRegistrationVerifyResponseDto,
} from './DTO/passkey.dto';
import { RefreshTokenResponseDto } from './DTO/refresh-token.dto';
import { RegisterRequestDto, RegisterResponseDto } from './DTO/register.dto';
import {
  ResetPasswordRequestDto,
  ResetPasswordRequestRequestDto,
  ResetPasswordVerifyRequestDto,
  ResetPasswordVerifyResponseDto,
} from './DTO/reset-password.dto';
import {
  SendEmailVerifyCodeRequestDto,
  SendEmailVerifyCodeResponseDto,
} from './DTO/send-email-verify-code.dto';
import {
  SrpInitRequestDto,
  SrpInitResponseDto,
  SrpVerifyRequestDto,
  SrpVerifyResponseDto,
} from './DTO/srp.dto';
import { VerifySudoRequestDto, VerifySudoResponseDto } from './DTO/sudo.dto';
import {
  Disable2FARequestDto,
  Disable2FAResponseDto,
  Enable2FARequestDto,
  Enable2FAResponseDto,
  GenerateBackupCodesRequestDto,
  GenerateBackupCodesResponseDto,
  Get2FAStatusResponseDto,
  Update2FASettingsRequestDto,
  Update2FASettingsResponseDto,
  Verify2FARequestDto,
} from './DTO/totp.dto';
import {
  UpdateUserRequestDto,
  UpdateUserResponseDto,
} from './DTO/update-user.dto';
import { UserDto } from './DTO/user.dto';
import { TOTPService } from './totp.service';
import {
  InvalidLoginCredentialsError,
  PasskeyNotFoundError,
  TOTPRequiredError,
  UserIdNotFoundError,
  UsernameNotFoundError,
} from './users.error';
import { UsersService } from './users.service';

declare module 'express-session' {
  interface SessionData {
    passkeyChallenge?: string;
    srpSession?: {
      serverSecretEphemeral: string;
    };
  }
}

@Controller('/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly prismaService: PrismaService,
    private readonly totpService: TOTPService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {}

  /**
   * Handle successful OAuth login redirect - 处理OAuth成功登录重定向
   * Extracts common logic for token refresh, cookie setting, and redirect
   */
  private async handleSuccessfulOAuthRedirect(
    res: Response,
    refreshToken: string,
    userDto: OAuthUserDto,
    queryParams?: Record<string, string>,
  ): Promise<void> {
    // Generate new access token
    const [newRefreshToken, jwtAccessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.authService.decode(newRefreshToken).validUntil,
    );

    // Set refresh token cookie
    const cookieBasePath = this.configService.get('cookieBasePath') || '';
    res.cookie('REFRESH_TOKEN', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: path.posix.join(cookieBasePath, 'users/auth'),
      expires: newRefreshTokenExpire,
    });

    // Construct redirect URL
    const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
    const successPath =
      this.configService.get('FRONTEND_OAUTH_SUCCESS_PATH') || '/oauth-success';

    const params = new URLSearchParams({
      token: jwtAccessToken,
      email: userDto.email || userDto.username,
      ...queryParams,
    });

    res.redirect(`${frontendBaseUrl}${successPath}?${params.toString()}`);
  }

  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    return userId;
  }

  @Post('/verify/email')
  @NoAuth()
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
  async sendRegisterEmailCode(
    @Body() { email }: SendEmailVerifyCodeRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<SendEmailVerifyCodeResponseDto> {
    await this.usersService.sendRegisterEmailCode(email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/')
  @NoAuth()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registrations per hour
  async register(
    @Body()
    {
      username,
      nickname,
      srpSalt,
      srpVerifier,
      email,
      emailCode,
      password,
      isLegacyAuth,
    }: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const userDto = await this.usersService.register(
      username,
      nickname,
      srpSalt,
      srpVerifier,
      email,
      emailCode,
      ip,
      userAgent,
      password,
      isLegacyAuth,
    );

    // 如果是传统认证方式，并且在测试环境下，自动登录
    if (
      isLegacyAuth &&
      password &&
      (process.env.NODE_ENV === 'test' ||
        process.env.NODE_ENV === 'development')
    ) {
      const [, refreshToken] = await this.usersService.login(
        username,
        password,
        ip,
        userAgent,
        isLegacyAuth,
      );
      const [newRefreshToken, accessToken] =
        await this.sessionService.refreshSession(refreshToken);
      const newRefreshTokenExpire = new Date(
        this.authService.decode(newRefreshToken).validUntil,
      );

      const data: RegisterResponseDto = {
        code: 201,
        message: 'Register successfully.',
        data: {
          user: userDto,
          accessToken,
        },
      };

      return res
        .cookie('REFRESH_TOKEN', newRefreshToken, {
          httpOnly: true,
          sameSite: 'strict',
          path: path.posix.join(
            this.configService.get('cookieBasePath')!,
            'users/auth',
          ),
          expires: new Date(newRefreshTokenExpire),
        })
        .json(data);
    }

    // 如果是 SRP 方式，自动创建会话
    if (srpSalt && srpVerifier) {
      // 直接创建会话，因为我们信任注册时提供的 verifier
      const accessToken = await this.usersService.createSessionForNewUser(
        userDto.id,
      );
      const [refreshToken, newAccessToken] =
        await this.sessionService.refreshSession(accessToken);
      const refreshTokenExpire = new Date(
        this.authService.decode(refreshToken).validUntil,
      );

      const data: RegisterResponseDto = {
        code: 201,
        message: 'Register successfully.',
        data: {
          user: userDto,
          accessToken: newAccessToken,
        },
      };

      return res
        .cookie('REFRESH_TOKEN', refreshToken, {
          httpOnly: true,
          sameSite: 'strict',
          path: path.posix.join(
            this.configService.get('cookieBasePath')!,
            'users/auth',
          ),
          expires: refreshTokenExpire,
        })
        .json(data);
    }

    // 如果执行到这里，说明请求参数不完整
    throw new Error(
      'Invalid registration parameters: either legacy auth or SRP credentials must be provided',
    );
  }

  @Post('/auth/login')
  @NoAuth()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 login attempts per 15 minutes
  async login(
    @Body() { username, password }: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const [userDto, refreshToken] = await this.usersService.login(
        username,
        password,
        ip,
        userAgent,
      );
      const [newRefreshToken, accessToken] =
        await this.sessionService.refreshSession(refreshToken);
      const newRefreshTokenExpire = new Date(
        this.authService.decode(newRefreshToken).validUntil,
      );
      const data: LoginResponseDto = {
        code: 201,
        message: 'Login successfully.',
        data: {
          user: userDto,
          accessToken,
          requires2FA: false,
        },
      };
      return res
        .cookie('REFRESH_TOKEN', newRefreshToken, {
          httpOnly: true,
          sameSite: 'strict',
          path: path.posix.join(
            this.configService.get('cookieBasePath')!,
            'users/auth',
          ),
          expires: new Date(newRefreshTokenExpire),
        })
        .json(data);
    } catch (e) {
      if (e instanceof TOTPRequiredError) {
        const data: LoginResponseDto = {
          code: 401,
          message: e.message,
          data: {
            requires2FA: true,
            tempToken: e.tempToken,
          },
        };
        return res.json(data);
      }
      throw e;
    }
  }

  @Post('/auth/refresh-token')
  @NoAuth()
  async refreshToken(
    @Headers('cookie') cookieHeader: string,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<Response> {
    if (cookieHeader == undefined) {
      throw new AuthenticationRequiredError();
    }
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('REFRESH_TOKEN='),
    );
    if (refreshTokenCookie == undefined) {
      throw new AuthenticationRequiredError();
    }
    const refreshToken = refreshTokenCookie.split('=')[1];
    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.authService.decode(newRefreshToken).validUntil,
    );
    const decodedAccessToken = this.authService.decode(accessToken);
    const userDto = await this.usersService.getUserDtoById(
      decodedAccessToken.authorization.userId,
      decodedAccessToken.authorization.userId,
      ip,
      userAgent,
    );
    const data: RefreshTokenResponseDto = {
      code: 201,
      message: 'Refresh token successfully.',
      data: {
        accessToken: accessToken,
        user: userDto,
      },
    };
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(
          this.configService.get('cookieBasePath')!,
          'users/auth',
        ),
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  @Post('/auth/logout')
  @NoAuth()
  async logout(
    @Headers('cookie') cookieHeader: string,
  ): Promise<BaseResponseDto> {
    if (cookieHeader == undefined) {
      throw new AuthenticationRequiredError();
    }
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('REFRESH_TOKEN='),
    );
    if (refreshTokenCookie == undefined) {
      throw new AuthenticationRequiredError();
    }
    const refreshToken = refreshTokenCookie.split('=')[1];
    await this.sessionService.revokeSession(refreshToken);
    return {
      code: 201,
      message: 'Logout successfully.',
    };
  }

  @Post('/recover/password/request')
  @NoAuth()
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 password reset requests per 5 minutes
  async sendResetPasswordEmail(
    @Body() { email }: ResetPasswordRequestRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<ResetPasswordRequestDto> {
    await this.usersService.sendResetPasswordEmail(email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/recover/password/verify')
  @NoAuth()
  async verifyAndResetPassword(
    @Body() { token, srpSalt, srpVerifier }: ResetPasswordVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<ResetPasswordVerifyResponseDto> {
    await this.usersService.verifyAndResetPassword(
      token,
      srpSalt,
      srpVerifier,
      ip,
      userAgent,
    );
    return {
      code: 201,
      message: 'Reset password successfully.',
    };
  }

  @Get('/:id')
  @Guard('query', 'user')
  async getUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetUserResponseDto> {
    const user = await this.usersService.getUserDtoById(
      id,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query user successfully.',
      data: {
        user: user,
      },
    };
  }

  @Put('/:id')
  @Guard('modify-profile', 'user')
  async updateUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Body() { nickname, intro, avatarId }: UpdateUserRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<UpdateUserResponseDto> {
    await this.usersService.updateUserProfile(id, nickname, intro, avatarId);
    return {
      code: 200,
      message: 'Update user successfully.',
    };
  }

  @Post('/:id/followers')
  @Guard('follow', 'user')
  async followUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<FollowResponseDto> {
    await this.usersService.addFollowRelationship(userId, id);
    return {
      code: 201,
      message: 'Follow user successfully.',
      data: {
        follow_count: await this.usersService.getFollowingCount(userId),
      },
    };
  }

  @Delete('/:id/followers')
  @Guard('unfollow', 'user')
  async unfollowUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<UnfollowResponseDto> {
    await this.usersService.deleteFollowRelationship(userId, id);
    return {
      code: 200,
      message: 'Unfollow user successfully.',
      data: {
        follow_count: await this.usersService.getFollowingCount(userId),
      },
    };
  }

  @Get('/:id/followers')
  @Guard('enumerate-followers', 'user')
  async getFollowers(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetFollowersResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    const [followers, page] = await this.usersService.getFollowers(
      id,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followers successfully.',
      data: {
        users: followers,
        page: page,
      },
    };
  }

  @Get('/:id/follow/users')
  @Guard('enumerate-followed-users', 'user')
  async getFollowees(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetFollowersResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    const [followees, page] = await this.usersService.getFollowees(
      id,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followees successfully.',
      data: {
        users: followees,
        page: page,
      },
    };
  }

  @Get('/:id/questions')
  @Guard('enumerate-questions', 'user')
  async getUserAskedQuestions(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetAskedQuestionsResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    const [questions, page] = await this.questionsService.getUserAskedQuestions(
      userId,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query asked questions successfully.',
      data: {
        questions,
        page,
      },
    };
  }

  @Get('/:id/answers')
  @Guard('enumerate-answers', 'user')
  async getUserAnsweredAnswers(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @UserId() viewerId: number | undefined,
  ): Promise<GetAnsweredAnswersResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    const [answers, page] =
      await this.answerService.getUserAnsweredAnswersAcrossQuestions(
        userId,
        pageStart,
        pageSize,
        viewerId,
        ip,
        userAgent,
      );
    return {
      code: 200,
      message: 'Query asked questions successfully.',
      data: {
        answers,
        page,
      },
    };
  }

  @Get('/:id/follow/questions')
  @Guard('enumerate-followed-questions', 'user')
  async getFollowedQuestions(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetFollowedQuestionsResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    const [questions, page] = await this.questionsService.getFollowedQuestions(
      userId,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followed questions successfully.',
      data: {
        questions,
        page,
      },
    };
  }

  // Passkey Registration
  @Post('/:id/passkeys/options')
  @Guard('register-passkey', 'user', true)
  async getPasskeyRegistrationOptions(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<PasskeyRegistrationOptionsResponseDto> {
    const options =
      await this.usersService.generatePasskeyRegistrationOptions(userId);
    return {
      code: 200,
      message: 'Generated registration options successfully.',
      data: {
        options: options as any, // Type assertion to fix compatibility issue
      },
    };
  }

  @Post('/:id/passkeys')
  @Guard('register-passkey', 'user', true)
  async verifyPasskeyRegistration(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() { response }: PasskeyRegistrationVerifyRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<PasskeyRegistrationVerifyResponseDto> {
    await this.usersService.verifyPasskeyRegistration(userId, response);
    return {
      code: 201,
      message: 'Passkey registered successfully.',
    };
  }

  // Passkey Authentication
  @Post('/auth/passkey/options')
  @NoAuth()
  async getPasskeyAuthenticationOptions(
    @Body() { userId }: PasskeyAuthenticationOptionsRequestDto,
    @Req() req: Request,
  ): Promise<PasskeyAuthenticationOptionsResponseDto> {
    const options =
      await this.usersService.generatePasskeyAuthenticationOptions(req, userId);
    req.session.passkeyChallenge = options.challenge;
    return {
      code: 200,
      message: 'Generated authentication options successfully.',
      data: {
        options: options as any, // Type assertion to fix compatibility issue
      },
    };
  }

  @Post('/auth/passkey/verify')
  @NoAuth()
  async verifyPasskeyAuthentication(
    @Req() req: Request,
    @Body() { response }: PasskeyAuthenticationVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    const verified = await this.usersService.verifyPasskeyAuthentication(
      req,
      response,
    );
    if (!verified) {
      throw new PasskeyNotFoundError(response.id);
    }

    const passkey = await this.prismaService.passkey.findFirst({
      where: {
        credentialId: response.id,
      },
    });

    if (!passkey) {
      throw new PasskeyNotFoundError(response.id);
    }

    const [userDto, refreshToken] = (await this.usersService.handlePasskeyLogin(
      passkey.userId,
      ip,
      userAgent,
    )) as [UserDto, string]; // Type assertion to fix compatibility issue

    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.authService.decode(newRefreshToken).validUntil,
    );

    const data: PasskeyAuthenticationVerifyResponseDto = {
      code: 201,
      message: 'Authentication successful.',
      data: {
        user: userDto,
        accessToken,
      },
    };

    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(
          this.configService.get('cookieBasePath')!,
          'users/auth',
        ),
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  // Passkey Management
  @Get('/:id/passkeys')
  @Guard('enumerate-passkeys', 'user')
  async getUserPasskeys(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<GetPasskeysResponseDto> {
    const passkeys = await this.usersService.getUserPasskeys(userId);
    return {
      code: 200,
      message: 'Query passkeys successfully.',
      data: {
        passkeys: passkeys.map((p) => ({
          id: p.credentialId,
          createdAt: p.createdAt,
          deviceType: p.deviceType,
          backedUp: p.backedUp,
        })),
      },
    };
  }

  @Delete('/:id/passkeys/:credentialId')
  @Guard('delete-passkey', 'user', true)
  async deletePasskey(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Param('credentialId') credentialId: string,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<DeletePasskeyResponseDto> {
    await this.usersService.deletePasskey(userId, credentialId);
    return {
      code: 200,
      message: 'Delete passkey successfully.',
    };
  }

  @Post('/auth/sudo')
  @Guard('verify-sudo', 'user')
  async verifySudo(
    @Req() req: Request,
    @Headers('Authorization') @AuthToken() auth: string,
    @Body() body: VerifySudoRequestDto,
  ): Promise<VerifySudoResponseDto> {
    // 验证并获取新 token
    const result = await this.usersService.verifySudo(
      req,
      auth,
      body.method,
      body.credentials,
    );

    let message = 'Sudo mode activated successfully';
    if (result.serverProof) {
      message = 'SRP verification successful';
    } else if (result.srpUpgraded) {
      message = 'Password verification successful and account upgraded to SRP';
    }

    return {
      code: 200,
      message,
      data: result,
    };
  }

  @Post('auth/verify-2fa')
  @NoAuth()
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 2FA attempts per 5 minutes
  async verify2FA(
    @Body() dto: Verify2FARequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    const [userDto, refreshToken, usedBackupCode] =
      await this.usersService.verifyTOTPAndLogin(
        dto.temp_token,
        dto.code,
        ip,
        userAgent,
      );
    const [newRefreshToken, accessToken] =
      await this.sessionService.refreshSession(refreshToken);
    const newRefreshTokenExpire = new Date(
      this.authService.decode(newRefreshToken).validUntil,
    );
    const data: LoginResponseDto = {
      code: 201,
      message: usedBackupCode
        ? 'Login successfully. Note: This backup code has expired. Please generate a new backup code for future use.'
        : 'Login successfully.',
      data: {
        user: userDto,
        accessToken,
        requires2FA: false,
        usedBackupCode: usedBackupCode,
      },
    };
    return res
      .cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(
          this.configService.get('cookieBasePath')!,
          'users/auth',
        ),
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  // 2FA 管理接口
  @Post(':id/2fa/enable')
  @Guard('modify-2fa', 'user', true)
  async enable2FA(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Enable2FARequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Enable2FAResponseDto> {
    // 如果是初始化阶段
    if (!dto.code) {
      const secret = await this.totpService.generateTOTPSecret();
      const user = await this.usersService.findUserRecordOrThrow(userId);
      const otpauthUrl = this.totpService.generateTOTPUri(
        secret,
        user.username,
      );

      // 生成二维码
      const qrcodeData = await qrcode.toDataURL(otpauthUrl);

      return {
        code: 200,
        message: 'TOTP secret generated successfully',
        data: {
          secret,
          otpauth_url: otpauthUrl,
          qrcode: qrcodeData,
          backup_codes: [], // 初始化阶段不生成备份码
        },
      };
    }

    // 如果是确认阶段，需要前端传入之前生成的 secret
    if (!dto.secret) {
      throw new Error('Secret is required for confirmation');
    }

    // 验证并启用 2FA
    const backupCodes = await this.totpService.enable2FA(
      userId,
      dto.secret,
      dto.code,
    );

    // 生成二维码（虽然这个阶段前端可能不需要了，但为了保持 API 一致性还是返回）
    const user = await this.usersService.findUserRecordOrThrow(userId);
    const otpauthUrl = this.totpService.generateTOTPUri(
      dto.secret,
      user.username,
    );
    const qrcodeData = await qrcode.toDataURL(otpauthUrl);

    return {
      code: 201,
      message: '2FA enabled successfully',
      data: {
        secret: dto.secret,
        otpauth_url: otpauthUrl,
        qrcode: qrcodeData,
        backup_codes: backupCodes,
      },
    };
  }

  @Post(':id/2fa/disable')
  @HttpCode(200)
  @Guard('modify-2fa', 'user', true)
  async disable2FA(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Disable2FARequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Disable2FAResponseDto> {
    await this.totpService.disable2FA(userId);
    return {
      code: 200,
      message: '2FA disabled successfully',
      data: {
        success: true,
      },
    };
  }

  @Post(':id/2fa/backup-codes')
  @Guard('modify-2fa', 'user', true)
  async generateBackupCodes(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: GenerateBackupCodesRequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<GenerateBackupCodesResponseDto> {
    // 生成新的备份码并保存
    const backupCodes =
      await this.totpService.generateAndSaveBackupCodes(userId);

    return {
      code: 201,
      message: 'New backup codes generated successfully',
      data: {
        backup_codes: backupCodes,
      },
    };
  }

  @Get(':id/2fa/status')
  @Guard('query', 'user')
  async get2FAStatus(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Get2FAStatusResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        totpEnabled: true,
        totpAlwaysRequired: true,
        passkeys: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new UserIdNotFoundError(userId);
    }

    return {
      code: 200,
      message: 'Get 2FA status successfully',
      data: {
        enabled: user.totpEnabled,
        has_passkey: user.passkeys.length > 0,
        always_required: user.totpAlwaysRequired,
      },
    };
  }

  @Put(':id/2fa/settings')
  @Guard('modify-2fa', 'user', true)
  async update2FASettings(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Update2FASettingsRequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Update2FASettingsResponseDto> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        totpAlwaysRequired: dto.always_required,
      },
    });

    return {
      code: 200,
      message: '2FA settings updated successfully',
      data: {
        success: true,
        always_required: dto.always_required,
      },
    };
  }

  @Post('/auth/srp/init')
  @NoAuth()
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 SRP init attempts per 15 minutes
  async srpInit(
    @Body() { username }: SrpInitRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
  ): Promise<SrpInitResponseDto> {
    const result = await this.usersService.handleSrpInit(username);

    // 将服务器的私密临时值存储在 session 中
    req.session.srpSession = {
      serverSecretEphemeral: result.serverSecretEphemeral,
    };

    return {
      code: 200,
      message: 'SRP initialization successful.',
      data: {
        salt: result.salt,
        serverPublicEphemeral: result.serverPublicEphemeral,
      },
    };
  }

  @Post('/auth/srp/verify')
  @NoAuth()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 SRP verify attempts per 15 minutes
  async srpVerify(
    @Body()
    { username, clientPublicEphemeral, clientProof }: SrpVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const sessionState = req.session.srpSession;
    if (!sessionState) {
      throw new Error('SRP session not found. Please initialize first.');
    }

    const result = await this.usersService.handleSrpVerify(
      username,
      clientPublicEphemeral,
      clientProof,
      sessionState.serverSecretEphemeral,
      ip,
      userAgent,
    );

    // 清除 session 中的 SRP 状态
    delete req.session.srpSession;

    if (result.requires2FA) {
      const data: SrpVerifyResponseDto = {
        code: 200,
        message: 'SRP verification successful, 2FA required.',
        data: {
          serverProof: result.serverProof,
          accessToken: '',
          requires2FA: true,
          tempToken: result.tempToken,
          user: result.user,
        },
      };
      return res.json(data);
    }

    // 如果不需要 2FA，设置 refresh token cookie
    const [refreshToken, accessToken] =
      await this.sessionService.refreshSession(result.accessToken);

    const refreshTokenExpire = new Date(
      this.authService.decode(refreshToken).validUntil,
    );

    const data: SrpVerifyResponseDto = {
      code: 200,
      message: 'SRP verification successful.',
      data: {
        serverProof: result.serverProof,
        accessToken,
        requires2FA: false,
        user: result.user,
      },
    };

    return res
      .cookie('REFRESH_TOKEN', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: path.posix.join(
          this.configService.get('cookieBasePath')!,
          'users/auth',
        ),
        expires: refreshTokenExpire,
      })
      .json(data);
  }

  @Get('/auth/methods/:username')
  @NoAuth()
  async getAuthMethods(@Param('username') username: string): Promise<{
    code: number;
    message: string;
    data: {
      supports_srp: boolean;
      supports_passkey: boolean;
      supports_2fa: boolean;
      requires_2fa: boolean;
    };
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Return default "safe" authentication methods to prevent user enumeration
      // This makes it appear that the user exists but only supports basic auth
      return {
        code: 200,
        message: 'Authentication methods retrieved successfully.',
        data: {
          supports_srp: false,
          supports_passkey: false,
          supports_2fa: false,
          requires_2fa: false,
        },
      };
    }

    const hasPasskeys =
      (await this.prismaService.passkey.count({
        where: { userId: user.id },
      })) > 0;

    return {
      code: 200,
      message: 'Authentication methods retrieved successfully.',
      data: {
        supports_srp: user.srpUpgraded,
        supports_passkey: hasPasskeys,
        supports_2fa: user.totpEnabled,
        requires_2fa: user.totpAlwaysRequired,
      },
    };
  }

  @Patch('/:id/password')
  @Guard('modify-profile', 'user', true) // 需要 sudo 模式
  async changePassword(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() { srpSalt, srpVerifier }: ChangePasswordRequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<ChangePasswordResponseDto> {
    await this.usersService.changePassword(userId, srpSalt, srpVerifier);

    return {
      code: 200,
      message: 'Password changed successfully',
    };
  }

  // OAuth 相关路由

  @Get('/auth/oauth/providers')
  @NoAuth()
  async getOAuthProviders(): Promise<GetOAuthProvidersResponseDto> {
    const providers = await this.oauthService.getProvidersConfig();
    return {
      code: 200,
      message: 'Get OAuth providers successfully.',
      data: {
        providers,
      },
    };
  }

  @Get('/auth/oauth/state')
  @NoAuth()
  async getOAuthState(@Query('token') stateToken: string): Promise<{
    code: number;
    message: string;
    data: {
      providerId: string;
      userInfo: {
        id: string;
        email?: string;
        name?: string;
        username?: string;
        preferredUsername?: string;
      };
      suggestedUsername: string;
      suggestedNickname: string;
      emailConflict: boolean;
    };
  }> {
    const stateInfo = await this.usersService.getOAuthStateInfo(stateToken);
    return {
      code: 200,
      message: 'Get OAuth state successfully.',
      data: stateInfo,
    };
  }

  @Get('/auth/oauth/login/:providerId')
  @NoAuth()
  async oauthLogin(
    @Param('providerId') providerId: string,
    @Query('state') state?: string,
    @Query('access_type') accessType?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const authUrl = await this.oauthService.generateAuthorizationUrl(
        providerId,
        state,
        accessType,
      );
      res!.redirect(authUrl);
      return;
    } catch (error) {
      if (error instanceof OAuthError) {
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const errorPath =
          this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
        const errorUrl = `${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(error.message)}&provider=${providerId}`;
        res!.redirect(errorUrl);
        return;
      }
      throw error;
    }
  }

  @Get('/auth/oauth/callback/:providerId')
  @NoAuth()
  async oauthCallback(
    @Param('providerId') providerId: string,
    @Query() query: OAuthCallbackQueryDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 检查是否有错误
      if (query.error) {
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const errorPath =
          this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
        const errorUrl = `${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(query.error)}&provider=${providerId}`;
        res.redirect(errorUrl);
        return;
      }

      // 处理OAuth回调
      const accessToken = await this.oauthService.handleCallback(
        providerId,
        query.code,
        query.state,
      );

      // 获取用户信息
      const userInfo = await this.oauthService.getUserInfo(
        providerId,
        accessToken,
      );

      // 检查是否是绑定模式
      if (query.state && query.state.startsWith('binding:')) {
        await this.handleOAuthBindingCallback(
          providerId,
          userInfo,
          query.state,
          res,
        );
        return;
      }

      // 新的OAuth流程处理
      const result = await this.usersService.initiateOAuthFlow(
        providerId,
        userInfo,
        ip,
        userAgent,
      );

      if (Array.isArray(result)) {
        // 已有OAuth连接，直接登录成功
        const [userDto, refreshToken] = result;
        await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto);
      } else if ('requiresVerification' in result) {
        // 邮箱已存在，需要验证身份后强制绑定
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const verifyPath =
          this.configService.get('FRONTEND_OAUTH_VERIFY_PATH') ||
          '/oauth-verify';

        const params = new URLSearchParams({
          type: result.verificationType,
          email: result.email,
          sessionId: result.sessionId,
        });

        if (result.salt) {
          params.append('salt', result.salt);
        }
        if (result.serverPublicEphemeral) {
          params.append('serverPublicEphemeral', result.serverPublicEphemeral);
        }

        res.redirect(`${frontendBaseUrl}${verifyPath}?${params.toString()}`);
      } else {
        // 需要用户决策：创建新账户还是绑定已有账户
        const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
        const completePath =
          this.configService.get('FRONTEND_OAUTH_COMPLETE_PATH') ||
          '/oauth-complete';

        const params = new URLSearchParams({
          stateToken: result.stateToken,
        });

        res.redirect(`${frontendBaseUrl}${completePath}?${params.toString()}`);
      }
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath =
        this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorMessage =
        error instanceof Error ? error.message : 'OAuth callback failed';
      const errorUrl = `${frontendBaseUrl}${errorPath}?error=${encodeURIComponent(errorMessage)}&provider=${providerId}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * 处理OAuth绑定回调
   */
  private async handleOAuthBindingCallback(
    providerId: string,
    userInfo: OAuthUserInfo,
    state: string,
    res: Response,
  ): Promise<void> {
    try {
      // 解析绑定会话ID：格式为 "binding:sessionId" 或 "binding:sessionId:originalState"
      const stateParts = state.split(':');
      const bindingSessionId = stateParts[1];

      if (!bindingSessionId) {
        throw new Error('Invalid binding state format');
      }

      // 处理绑定
      const result = await this.usersService.handleOAuthBindingCallback(
        providerId,
        userInfo,
        bindingSessionId,
      );

      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');

      if (result.success) {
        // 绑定成功，重定向到成功页面
        const successPath =
          this.configService.get('FRONTEND_OAUTH_SUCCESS_PATH') ||
          '/oauth-success';
        const params = new URLSearchParams({
          bound: 'true',
          provider: providerId,
          message: result.message,
        });
        res.redirect(`${frontendBaseUrl}${successPath}?${params.toString()}`);
      } else {
        // 绑定失败，重定向到错误页面
        const errorPath =
          this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
        const params = new URLSearchParams({
          error: result.message,
          provider: providerId,
          error_code: 'BINDING_FAILED',
        });
        res.redirect(`${frontendBaseUrl}${errorPath}?${params.toString()}`);
      }
    } catch (error) {
      this.logger.error('OAuth binding callback failed:', error);
      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath =
        this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorMessage =
        error instanceof Error ? error.message : 'OAuth binding failed';
      const params = new URLSearchParams({
        error: errorMessage,
        provider: providerId,
        error_code: 'BINDING_ERROR',
      });
      res.redirect(`${frontendBaseUrl}${errorPath}?${params.toString()}`);
    }
  }

  @Post('/auth/oauth/verify')
  @NoAuth()
  async oauthVerify(
    @Body()
    {
      sessionId,
      password,
      clientPublicEphemeral,
      clientProof,
    }: OAuthVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const credentials = {
        password,
        clientPublicEphemeral,
        clientProof,
      };

      const [userDto, refreshToken] =
        await this.usersService.completeOAuthVerification(
          sessionId,
          credentials,
          ip,
          userAgent,
        );

      // 使用提取的成功重定向方法
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, {
        linked: 'true',
      });
    } catch (error) {
      this.logger.error('OAuth verification failed:', error);

      // More specific error handling
      let errorCode = 'VERIFICATION_FAILED';
      let errorMessage = 'OAuth verification failed';

      if (error instanceof Error) {
        if (error.constructor.name === 'PasswordNotMatchError') {
          errorCode = 'INVALID_PASSWORD';
          errorMessage = 'Invalid password provided';
        } else if (error.constructor.name === 'SrpVerificationError') {
          errorCode = 'INVALID_SRP_PROOF';
          errorMessage = 'SRP verification failed';
        } else if (error.message.includes('session not found')) {
          errorCode = 'SESSION_EXPIRED';
          errorMessage = 'Verification session expired';
        } else {
          errorMessage = error.message;
        }
      }

      const frontendBaseUrl = this.configService.get('FRONTEND_BASE_URL');
      const errorPath =
        this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorUrl = `${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`;
      res.redirect(errorUrl);
    }
  }

  @Post('/oauth/create')
  @NoAuth()
  async createOAuthUser(
    @Body()
    {
      stateToken,
      username,
      nickname,
    }: {
      stateToken: string;
      username: string;
      nickname: string;
    },
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const [userDto, refreshToken] =
        await this.usersService.createOAuthUserFromDecision(
          stateToken,
          username,
          nickname,
          ip,
          userAgent,
        );

      // 使用提取的成功重定向方法
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, {
        created: 'true',
      });
    } catch (error) {
      this.logger.error('OAuth user creation failed:', error);

      let errorCode = 'CREATION_FAILED';
      let errorMessage = 'Failed to create user';

      if (error instanceof Error) {
        if (error instanceof InvalidTokenError) {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Session expired, please try again';
        } else if (error.message.includes('Username already registered')) {
          errorCode = 'USERNAME_TAKEN';
          errorMessage = 'Username already registered';
        } else if (error.message.includes('Invalid username')) {
          errorCode = 'INVALID_USERNAME';
          errorMessage = 'Invalid username format';
        } else if (error.message.includes('Invalid or expired')) {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Session expired, please try again';
        } else {
          errorMessage = error.message;
        }
      }

      const frontendBaseUrl =
        this.configService.get('FRONTEND_BASE_URL') || 'http://localhost:3000';
      const errorPath =
        this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorUrl = `${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`;
      res.redirect(errorUrl);
    }
  }

  @Post('/oauth/bind')
  @NoAuth()
  async bindOAuthToExistingUser(
    @Body()
    {
      stateToken,
      username,
      password,
      clientPublicEphemeral,
      clientProof,
    }: {
      stateToken: string;
      username: string;
      password?: string;
      clientPublicEphemeral?: string;
      clientProof?: string;
    },
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const credentials = {
        password,
        clientPublicEphemeral,
        clientProof,
      };

      const [userDto, refreshToken] =
        await this.usersService.bindOAuthToExistingUser(
          stateToken,
          username,
          credentials,
          ip,
          userAgent,
        );

      // 使用提取的成功重定向方法
      await this.handleSuccessfulOAuthRedirect(res, refreshToken, userDto, {
        bound: 'true',
      });
    } catch (error) {
      this.logger.error('OAuth binding to existing user failed:', error);

      let errorCode = 'BINDING_FAILED';
      let errorMessage = 'Failed to bind OAuth account';

      if (error instanceof Error) {
        if (error instanceof InvalidTokenError) {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Session expired, please try again';
        } else if (error instanceof UsernameNotFoundError) {
          errorCode = 'USER_NOT_FOUND';
          errorMessage = 'User not found';
        } else if (error instanceof InvalidLoginCredentialsError) {
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = 'Invalid login credentials';
        } else if (error.message.includes('Invalid or expired')) {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Session expired, please try again';
        } else {
          errorMessage = error.message;
        }
      }

      const frontendBaseUrl =
        this.configService.get('FRONTEND_BASE_URL') || 'http://localhost:3000';
      const errorPath =
        this.configService.get('FRONTEND_OAUTH_ERROR_PATH') || '/oauth-error';
      const errorUrl = `${frontendBaseUrl}${errorPath}?error_code=${errorCode}&error=${encodeURIComponent(errorMessage)}`;
      res.redirect(errorUrl);
    }
  }

  // OAuth 绑定相关端点

  @Post('/:id/oauth/bind/:providerId')
  @Guard('modify-oauth', 'user', true) // 需要 sudo 权限
  async bindOAuth(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Param('providerId') providerId: string,
    @Body() { state, accessType }: OAuthBindRequestDto,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<OAuthBindResponseDto> {
    try {
      // 初始化绑定会话
      const { bindingSessionId } = await this.usersService.initOAuthBinding(
        userId,
        providerId,
        state,
      );

      // 生成OAuth授权URL，将绑定会话ID作为state参数
      const bindingState = `binding:${bindingSessionId}${state ? `:${state}` : ''}`;
      const authUrl = await this.oauthService.generateAuthorizationUrl(
        providerId,
        bindingState,
        accessType,
      );

      return {
        code: 200,
        message: 'OAuth binding initialized successfully.',
        data: {
          success: true,
          provider: providerId,
          bindUrl: authUrl,
        },
      };
    } catch (error) {
      this.logger.error(`OAuth binding initialization failed:`, error);
      throw error;
    }
  }

  @Get('/:id/oauth/connections')
  @Guard('query-oauth', 'user')
  async getUserOAuthConnections(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<GetUserOAuthConnectionsResponseDto> {
    const connections = await this.usersService.getUserOAuthConnections(userId);

    return {
      code: 200,
      message: 'Get OAuth connections successfully.',
      data: {
        connections,
      },
    };
  }

  @Delete('/:id/oauth/connections/:connectionId')
  @Guard('modify-oauth', 'user', true) // 需要 sudo 权限
  async unbindOAuth(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<UnbindOAuthResponseDto> {
    try {
      const result = await this.usersService.unbindOAuth(userId, connectionId);

      return {
        code: 200,
        message: 'OAuth connection unbound successfully.',
        data: result,
      };
    } catch (error) {
      this.logger.error(`OAuth unbinding failed:`, error);
      throw error;
    }
  }
}

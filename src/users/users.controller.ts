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
import { Request, Response } from 'express';
import path from 'node:path';
import qrcode from 'qrcode';
import { AnswerService } from '../answer/answer.service';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import {
  AuthToken,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';
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
      clientPublicEphemeral: string;
    };
  }
}

@Controller('/users')
export class UsersController {
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
  ) {}

  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    return userId;
  }

  @Post('/verify/email')
  @NoAuth()
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
  async srpInit(
    @Body() { username, clientPublicEphemeral }: SrpInitRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Req() req: Request,
  ): Promise<SrpInitResponseDto> {
    const result = await this.usersService.handleSrpInit(
      username,
      clientPublicEphemeral,
    );

    // 将服务器的私密临时值存储在 session 中
    req.session.srpSession = {
      serverSecretEphemeral: result.serverSecretEphemeral,
      clientPublicEphemeral,
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
  async srpVerify(
    @Body() { username, clientProof }: SrpVerifyRequestDto,
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
      sessionState.clientPublicEphemeral,
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
    try {
      const user =
        await this.usersService.findUserRecordByUsernameOrThrow(username);

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
    } catch (error) {
      if (error instanceof UsernameNotFoundError) {
        // 如果用户不存在，返回所有方法都不支持
        return {
          code: 200,
          message: 'User not found, no authentication methods available.',
          data: {
            supports_srp: false,
            supports_passkey: false,
            supports_2fa: false,
            requires_2fa: false,
          },
        };
      }
      throw error;
    }
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
}

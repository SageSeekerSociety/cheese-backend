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
  Get,
  Headers,
  Inject,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import path from 'node:path';
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
import { QuestionsService } from '../questions/questions.service';
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
  UpdateUserRequestDto,
  UpdateUserResponseDto,
} from './DTO/update-user.dto';
import { UsersService } from './users.service';

@Controller('/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
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
    { username, nickname, password, email, emailCode }: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    const userDto = await this.usersService.register(
      username,
      nickname,
      password,
      email,
      emailCode,
      ip,
      userAgent,
    );
    const [, refreshToken] = await this.usersService.login(
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

  @Post('/auth/login')
  @NoAuth()
  async login(
    @Body() { username, password }: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
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
    @Body() { token, new_password }: ResetPasswordVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<ResetPasswordVerifyResponseDto> {
    await this.usersService.verifyAndResetPassword(
      token,
      new_password,
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
}

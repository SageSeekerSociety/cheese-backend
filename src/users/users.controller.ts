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
  ClassSerializerInterceptor,
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
  UseFilters,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { AnswerService } from '../answer/answer.service';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { PageDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  NoTokenValidate,
  TokenValidateInterceptor,
} from '../common/interceptor/token-validate.interceptor';
import { QuestionsService } from '../questions/questions.service';
import {
  FollowRespondDto as FollowUserRespondDto,
  UnfollowRespondDto as UnfollowUserRespondDto,
} from './DTO/follow-unfollow.dto';
import { GetAnsweredAnswersRespondDto } from './DTO/get-answered-answers.dto';
import { GetAskedQuestionsRespondDto } from './DTO/get-asked-questions.dto';
import { GetFollowedQuestionsRespondDto } from './DTO/get-followed-questions.dto';
import { GetFollowersRespondDto } from './DTO/get-followers.dto';
import { GetUserRespondDto } from './DTO/get-user.dto';
import { LoginRequestDto, LoginRespondDto } from './DTO/login.dto';
import { RefreshTokenRespondDto } from './DTO/refresh-token.dto';
import { RegisterRequestDto, RegisterResponseDto } from './DTO/register.dto';
import {
  ResetPasswordRequestRequestDto,
  ResetPasswordRequestRespondDto,
  ResetPasswordVerifyRequestDto,
  ResetPasswordVerifyRespondDto,
} from './DTO/reset-password.dto';
import {
  SendEmailVerifyCodeRequestDto,
  SendEmailVerifyCodeResponseDto,
} from './DTO/send-email-verify-code.dto';
import {
  UpdateUserRequestDto,
  UpdateUserRespondDto,
} from './DTO/update-user.dto';
import { UsersService } from './users.service';

@Controller('/users')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
  ) {}

  @Post('/verify/email')
  @NoTokenValidate()
  async sendRegisterEmailCode(
    @Body() { email }: SendEmailVerifyCodeRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SendEmailVerifyCodeResponseDto> {
    await this.usersService.sendRegisterEmailCode(email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/')
  @NoTokenValidate()
  async register(
    @Body()
    { username, nickname, password, email, emailCode }: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
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
        path: '/users/auth',
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  @Post('/auth/login')
  @NoTokenValidate()
  async login(
    @Body() { username, password }: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
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
    const data: LoginRespondDto = {
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
        path: '/users/auth',
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  @Post('/auth/refresh-token')
  @NoTokenValidate()
  async refreshToken(
    @Headers('cookie') cookieHeader: string,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
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
    const data: RefreshTokenRespondDto = {
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
        path: '/users/auth',
        expires: new Date(newRefreshTokenExpire),
      })
      .json(data);
  }

  @Post('/auth/logout')
  @NoTokenValidate()
  async logout(
    @Headers('cookie') cookieHeader: string,
  ): Promise<BaseRespondDto> {
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
  @NoTokenValidate()
  async sendResetPasswordEmail(
    @Body() { email }: ResetPasswordRequestRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<ResetPasswordRequestRespondDto> {
    await this.usersService.sendResetPasswordEmail(email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/recover/password/verify')
  @NoTokenValidate()
  async verifyAndResetPassword(
    @Body() { token, new_password }: ResetPasswordVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<ResetPasswordVerifyRespondDto> {
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
  async getUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetUserRespondDto> {
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() { nickname, intro, avatarId }: UpdateUserRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UpdateUserRespondDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.modify,
      id,
      'users/profile',
      undefined,
    );
    await this.usersService.updateUserProfile(id, nickname, intro, avatarId);
    return {
      code: 200,
      message: 'Update user successfully.',
    };
  }

  @Post('/:id/followers')
  async followUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<FollowUserRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'users/following',
      undefined,
    );
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
  async unfollowUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UnfollowUserRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      userId,
      'users/following',
      undefined,
    );
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
  async getFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async getFollowees(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async getUserAskedQuestions(
    @Param('id', ParseIntPipe) userId: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAskedQuestionsRespondDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  @UseInterceptors(ClassSerializerInterceptor)
  async getUserAnsweredAnswers(
    @Param('id', ParseIntPipe) userId: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAnsweredAnswersRespondDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async getFollowedQuestions(
    @Param('id', ParseIntPipe) userId: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowedQuestionsRespondDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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

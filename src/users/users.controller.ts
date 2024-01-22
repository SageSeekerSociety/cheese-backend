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
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  FollowRespondDto as FollowUserRespondDto,
  UnfollowRespondDto as UnfollowUserRespondDto,
} from './DTO/follow-unfollow.dto';
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
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('/verify/email')
  async sendRegisterEmailCode(
    @Body() request: SendEmailVerifyCodeRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SendEmailVerifyCodeResponseDto> {
    await this.usersService.sendRegisterEmailCode(request.email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/')
  async register(
    @Body() request: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
    @Res() res: Response,
  ): Promise<Response> {
    const userDto = await this.usersService.register(
      request.username,
      request.nickname,
      request.password,
      request.email,
      request.emailCode,
      ip,
      userAgent,
    );
    const [_, refreshToken] = await this.usersService.login(
      request.username,
      request.password,
      ip,
      userAgent,
    );
    const refreshTokenExpire = new Date(
      this.authService.decode(refreshToken).validUntil,
    );
    const accessToken = await this.sessionService.refreshSession(refreshToken);
    const data: RegisterResponseDto = {
      code: 201,
      message: 'Register successfully.',
      data: {
        user: userDto,
        accessToken,
      },
    };
    return res
      .cookie('REFRESH_TOKEN', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/users/auth/access-token',
        expires: new Date(refreshTokenExpire),
      })
      .json(data);
  }

  @Post('/auth/login')
  async login(
    @Body() request: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
    @Res() res: Response,
  ): Promise<Response> {
    const [userDto, refreshToken] = await this.usersService.login(
      request.username,
      request.password,
      ip,
      userAgent,
    );
    const refreshTokenExpire = new Date(
      this.authService.decode(refreshToken).validUntil,
    );
    const accessToken = await this.sessionService.refreshSession(refreshToken);
    const data: LoginRespondDto = {
      code: 201,
      message: 'Login successfully.',
      data: {
        user: userDto,
        accessToken,
      },
    };
    return res
      .cookie('REFRESH_TOKEN', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/users/auth/access-token',
        expires: new Date(refreshTokenExpire),
      })
      .json(data);
  }

  @Get('/auth/access-token')
  async refreshToken(
    @Headers('cookie') cookieHeader: string,
  ): Promise<RefreshTokenRespondDto> {
    if (cookieHeader == null) {
      throw new AuthenticationRequiredError();
    }
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('REFRESH_TOKEN='),
    );
    if (refreshTokenCookie == null) {
      throw new AuthenticationRequiredError();
    }
    const refreshToken = refreshTokenCookie.split('=')[1];
    return {
      code: 200,
      message: 'Refresh token successfully.',
      accessToken: await this.sessionService.refreshSession(refreshToken),
    };
  }

  @Post('/auth/logout')
  async logout(
    @Headers('cookie') cookieHeader: string,
  ): Promise<BaseRespondDto> {
    if (cookieHeader == null) {
      throw new AuthenticationRequiredError();
    }
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('REFRESH_TOKEN='),
    );
    if (refreshTokenCookie == null) {
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
  async sendResetPasswordEmail(
    @Body() request: ResetPasswordRequestRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<ResetPasswordRequestRespondDto> {
    await this.usersService.sendResetPasswordEmail(
      request.email,
      ip,
      userAgent,
    );
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/recover/password/verify')
  async verifyAndResetPassword(
    @Body() request: ResetPasswordVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<ResetPasswordVerifyRespondDto> {
    await this.usersService.verifyAndResetPassword(
      request.token,
      request.new_password,
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
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetUserRespondDto> {
    let viewerId: number = null;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {}
    const user = await this.usersService.getUserDtoById(
      id,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query user successfully.',
      data: user,
    };
  }

  @Put('/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateUserRequestDto,
    @Headers('Authorization') auth: string,
  ): Promise<UpdateUserRespondDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.modify,
      id,
      'users/profile',
      null,
    );
    await this.usersService.updateUserProfile(
      id,
      request.nickname,
      request.avatar,
      request.intro,
    );
    return {
      code: 200,
      message: 'Update user successfully.',
    };
  }

  @Post('/:id/followers')
  async followUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
  ): Promise<FollowUserRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'users/following',
      null,
    );
    await this.usersService.addFollowRelationship(userId, id);
    return {
      code: 201,
      message: 'Follow user successfully.',
      data: {
        follow_count: await this.usersService.getFolloweeCount(userId),
      },
    };
  }

  @Delete('/:id/followers')
  async unfollowUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
  ): Promise<UnfollowUserRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      userId,
      'users/following',
      null,
    );
    await this.usersService.deleteFollowRelationship(userId, id);
    return {
      code: 200,
      message: 'Unfollow user successfully.',
      data: {
        follow_count: await this.usersService.getFolloweeCount(userId),
      },
    };
  }

  @Get('/:id/followers')
  async getFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number,
    @Query('page_size', new ParseIntPipe({ optional: true })) pageSize: number,
    @Request() req: Request,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == null || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number = null;
    try {
      const auth = req.headers['Authorization'];
      const decoded = this.authService.verify(auth.split(' ')[1]);
      viewerId = decoded.userId;
    } catch {}
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
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number,
    @Query('page_size', new ParseIntPipe({ optional: true })) pageSize: number,
    @Request() req: Request,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == null || pageSize == 0) pageSize = 20;
    // try get viewer id
    let viewerId: number = null;
    try {
      const auth = req.headers['Authorization'];
      const decoded = this.authService.verify(auth.split(' ')[1]);
      viewerId = decoded.userId;
    } catch {}
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
}

/*
 *  Description: This file implements the Account controller for user account management.
 *               It is responsible for handling requests to /users/... related to accounts.
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
  ParseIntPipe,
  Patch,
  Post,
  Put,
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

import { AuthToken, Guard, ResourceId } from '../../auth/guard.decorator'; // Assuming these are general enough
import { UserId } from '../../auth/user-id.decorator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { BaseErrorExceptionFilter } from '../../common/error/error-filter';
import { NoAuth } from '../../common/interceptor/token-validate.interceptor';
import { SessionService } from '../../auth/session.service'; // For register auto-login
import { AuthService as SharedAuthService } from '../../auth/auth.service'; // For register auto-login (decode token)


// DTOs from this module
import { ChangePasswordRequestDto, ChangePasswordResponseDto } from './dto/change-password.dto';
import { GetUserResponseDto } from './dto/get-user.dto';
import { RegisterRequestDto, RegisterResponseDto } from './dto/register.dto';
import {
  ResetPasswordRequestDto,
  ResetPasswordRequestRequestDto,
  ResetPasswordVerifyRequestDto,
  ResetPasswordVerifyResponseDto,
} from './dto/reset-password.dto';
import {
  SendEmailVerifyCodeRequestDto,
  SendEmailVerifyCodeResponseDto,
} from './dto/send-email-verify-code.dto';
import { UpdateUserRequestDto, UpdateUserResponseDto } from './dto/update-user.dto';

// Service from this module
import { AccountService } from './account.service';
// Temporary: For register auto-login, will call the new UserAuthService eventually
import { AuthService as UserAuthService } from '../auth/auth.service';
import { ResourceOwnerIdGetter } from '../../auth/guard.decorator'; // Import for Guard

@Controller('/users') // Base path for account related actions
@UseFilters(BaseErrorExceptionFilter)
export class AccountController {
  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    // For user resources, the resource ID from the path is the owner's ID
    return userId;
  }
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    // For register auto-login (temporary, should be handled by client or dedicated flow)
    private readonly sessionService: SessionService,
    private readonly sharedAuthService: SharedAuthService,
    @Inject(forwardRef(() => UserAuthService))
    private readonly userAuthService: UserAuthService,
  ) {}

  @Post('/verify/email')
  @NoAuth()
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async sendRegisterEmailCode(
    @Body() { email }: SendEmailVerifyCodeRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<SendEmailVerifyCodeResponseDto> {
    await this.accountService.sendRegisterEmailCode(email, ip, userAgent);
    return {
      code: 201,
      message: 'Send email successfully.',
    };
  }

  @Post('/') // i.e., POST /users for registration
  @NoAuth()
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async register(
    @Body() registerDto: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    @Res() res: Response, // Inject Res for cookie setting
  ): Promise<Response> { // Return type is Response due to cookie setting
    const userDto = await this.accountService.register(
      registerDto.username, registerDto.nickname, registerDto.srpSalt, registerDto.srpVerifier,
      registerDto.email, registerDto.emailCode, ip, userAgent, registerDto.password, registerDto.isLegacyAuth,
    );

    // Auto-login logic (temporary, ideally client handles this by calling login endpoint)
    if (registerDto.isLegacyAuth && registerDto.password &&
        (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')) {
      const [, authRefreshToken] = await this.userAuthService.login( // Call new UserAuthService
        registerDto.username, registerDto.password, ip, userAgent, true
      );
      const [newRefreshToken, accessToken] = await this.sessionService.refreshSession(authRefreshToken);
      const newRefreshTokenExpire = new Date(this.sharedAuthService.decode(newRefreshToken).validUntil);

      const responseData: RegisterResponseDto = {
        code: 201, message: 'Register successfully.', data: { user: userDto, accessToken },
      };
      const cookieBasePath = this.configService.get('cookieBasePath') || '';
      return res.cookie('REFRESH_TOKEN', newRefreshToken, {
          httpOnly: true, sameSite: 'strict',
          path: path.posix.join(cookieBasePath, 'auth'), // Cookie path should be for /auth
          expires: newRefreshTokenExpire,
        }).json(responseData);

    } else if (registerDto.srpSalt && registerDto.srpVerifier) {
      // Auto-create session for SRP registration
      const sessionToken = await this.userAuthService.createSessionForNewUser(userDto.id);
      const [newRefreshToken, newAccessToken] = await this.sessionService.refreshSession(sessionToken);
      const newRefreshTokenExpire = new Date(this.sharedAuthService.decode(newRefreshToken).validUntil);

      const responseData: RegisterResponseDto = {
        code: 201, message: 'Register successfully.', data: { user: userDto, accessToken: newAccessToken },
      };
      const cookieBasePath = this.configService.get('cookieBasePath') || '';
      return res.cookie('REFRESH_TOKEN', newRefreshToken, {
        httpOnly: true, sameSite: 'strict',
        path: path.posix.join(cookieBasePath, 'auth'), // Cookie path for /auth
        expires: newRefreshTokenExpire,
      }).json(responseData);
    }
    // Default response if no auto-login
    return res.status(201).json({ code: 201, message: 'Register successfully.', data: { user: userDto } });
  }

  @Post('/recover/password/request')
  @NoAuth()
  @Throttle({ default: { limit: 2, ttl: 300000 } })
  async sendResetPasswordEmail(
    @Body() { email }: ResetPasswordRequestRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<ResetPasswordRequestDto> {
    await this.accountService.sendResetPasswordEmail(email, ip, userAgent);
    return {
      code: 201, // Or 200, as it's an accepted request
      message: 'If your email is registered, you will receive a password reset link.', // More secure message
    };
  }

  @Post('/recover/password/verify')
  @NoAuth()
  async verifyAndResetPassword(
    @Body() { token, srpSalt, srpVerifier }: ResetPasswordVerifyRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<ResetPasswordVerifyResponseDto> {
    await this.accountService.verifyAndResetPassword(token, srpSalt, srpVerifier, ip, userAgent);
    return {
      code: 200, // Password reset was successful
      message: 'Reset password successfully.',
    };
  }

  @Get('/:id')
  @Guard('query', 'user') // Assuming 'user' is the resource type for Guard
  async getUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @UserId() viewerId: number | undefined, // Get viewerId from decorator
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
     // @Headers('Authorization') @AuthToken() auth: string | undefined, // AuthToken might not be needed if Guard handles it
  ): Promise<GetUserResponseDto> {
    const user = await this.accountService.getUserDtoById(id, viewerId, ip, userAgent);
    return {
      code: 200,
      message: 'Query user successfully.',
      data: { user },
    };
  }

  @Put('/:id')
  @Guard('modify-profile', 'user')
  async updateUser(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Body() updateUserDto: UpdateUserRequestDto,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Guard handles auth
  ): Promise<UpdateUserResponseDto> {
    await this.accountService.updateUserProfile(id, updateUserDto.nickname, updateUserDto.intro, updateUserDto.avatarId);
    return {
      code: 200,
      message: 'Update user successfully.',
    };
  }

  @Patch('/:id/password')
  @Guard('modify-profile', 'user', true) // true for sudo requirement
  async changePassword(
    @Param('id', ParseIntPipe) @ResourceId() userId: number,
    @Body() { srpSalt, srpVerifier }: ChangePasswordRequestDto,
    // @Headers('Authorization') @AuthToken() auth: string, // Guard handles auth & sudo
  ): Promise<ChangePasswordResponseDto> {
    await this.accountService.changePassword(userId, srpSalt, srpVerifier);
    return {
      code: 200,
      message: 'Password changed successfully',
    };
  }
}

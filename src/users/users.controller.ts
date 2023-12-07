import {
  Body,
  ConsoleLogger,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseFilters,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { AddFollowerRespondDto, DeleteFollowerRespondDto } from './DTO/add-follower.dto';
import { GetFollowersRespondDto } from './DTO/get-followers-dto';
import { GetUserRespondDto } from './DTO/get-user.dto';
import { LoginRequestDto, LoginRespondDto } from './DTO/login.dto';
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
import { BaseErrorExceptionFilter } from '../common/error/error-filter';

@Controller("/users")
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) { }

  @Post('/verify/email')
  async sendRegisterEmailCode(
    @Body() request: SendEmailVerifyCodeRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SendEmailVerifyCodeResponseDto> {
    console.log("Debug1")
    await this.usersService.sendRegisterEmailCode(
      request.email,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Send email successfully.',
    }
  }

  @Post('/')
  async register(
    @Body() request: RegisterRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<RegisterResponseDto> {
    const userDto = await this.usersService.register(
      request.username,
      request.nickname,
      request.password,
      request.email,
      request.emailCode,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Register successfully.',
      data: {
        user: userDto,
        token: await this.usersService.userLoginToken(userDto.id),
      },
    }
  }

  @Post('/auth/login')
  async login(
    @Body() request: LoginRequestDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ) {
    const userDto = await this.usersService.login(
      request.username,
      request.password,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Login successfully.',
      data: {
        user: userDto,
        token: await this.usersService.userLoginToken(userDto.id),
      },
    }
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
      code: 200,
      message: 'Send email successfully.',
    }
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
      code: 200,
      message: 'Reset password successfully.',
    }
  }

  @Get('/:id')
  async getUser(
    @Param('id') id: number,
    // @Headers('Authorization') auth: string,
    @Request() req: Request,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetUserRespondDto> {
    var viewerId: number = null;
    try {
      const auth = req.headers['Authorization'];
      const decoded = this.authService.verify(auth.split(' ')[1]);
      viewerId = decoded.userId;
    } catch { }
    const user = await this.usersService.getUserDtoById(
      id,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 0,
      message: 'Query user successfully.',
      data: user,
    };
  }

  @Put('/:id')
  async updateUser(
    @Param('id') id: number,
    @Body() request: UpdateUserRequestDto,
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<UpdateUserRespondDto> {
    this.authService.audit(
      auth.split(' ')[1],
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
      code: 0,
      message: 'Update user successfully.',
    }
  }

  @Post('/:id/followers')
  async addFollower(
    @Param('id') id: number,
    @Headers('Authorization') auth: string,
  ): Promise<AddFollowerRespondDto> {
    const userId = this.authService.verify(auth.split(' ')[1]).userId;
    this.authService.audit(
      auth.split(' ')[1],
      AuthorizedAction.create,
      userId,
      'users/following',
      null,
    );
    await this.usersService.addFollowRelationship(userId, id);
    return {
      code: 0,
      message: 'Add follower successfully.',
      data: {
        follow_count: await this.usersService.getFolloweeCount(userId),
      },
    }
  }

  @Delete('/:id/followers')
  async deleteFollower(
    @Param('id') id: number,
    @Headers('Authorization') auth: string,
  ) {
    const userId = this.authService.verify(auth.split(' ')[1]).userId;
    this.authService.audit(
      auth.split(' ')[1],
      AuthorizedAction.delete,
      userId,
      'users/following',
      null,
    );
    await this.usersService.deleteFollowRelationship(userId, id);
    return {
      code: 0,
      message: 'Delete follower successfully.',
      data: {
        follow_count: await this.usersService.getFolloweeCount(userId),
      },
    }
  }

  @Get('/:id/followers')
  async getFollowers(
    @Param('id') id: number,
    @Query('page_start') pageStart: number,
    @Query('page_size') pageSize: number,
    @Request() req: Request,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == null || pageSize == 0)
      pageSize = 20
    // try get viewer id
    var viewerId: number = null;
    try {
      const auth = req.headers['Authorization'];
      const decoded = this.authService.verify(auth.split(' ')[1]);
      viewerId = decoded.userId;
    } catch { }
    const [followers, page] = await this.usersService.getFollowers(
      id,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 0,
      message: 'Query followers successfully.',
      data: {
        users: followers,
        page: page,
      },
    }
  }

  @Get('/:id/follow/users')
  async getFollowees(
    @Param('id') id: number,
    @Query('page_start') pageStart: number,
    @Query('page_size') pageSize: number,
    @Request() req: Request,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetFollowersRespondDto> {
    if (pageSize == null || pageSize == 0)
      pageSize = 20
    // try get viewer id
    var viewerId: number = null;
    try {
      const auth = req.headers['Authorization'];
      const decoded = this.authService.verify(auth.split(' ')[1]);
      viewerId = decoded.userId;
    } catch { }
    const [followees, page] = await this.usersService.getFollowees(
      id,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 0,
      message: 'Query followees successfully.',
      data: {
        users: followees,
        page: page,
      },
    }
  }
}

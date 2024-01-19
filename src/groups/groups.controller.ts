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
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { GroupsService } from './groups.service';

@Controller('/groups')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class GroupsController {
  constructor(private readonly groupsService: GroupsService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,) { }

  @Post('/')
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<RegisterResponseDto> {
    const userDto = await this.groupsService.createGroup(
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
    return {
      code: 201,
      message: 'Register successfully.',
      data: {
        user: userDto,
        refreshToken: refreshToken,
      },
    };
  }

  @Get()
  findAll(@Query() query: QueryGroupDto) {
    return this.groupsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(+id);
  }

  // other endpoints for members, questions, and targets
}

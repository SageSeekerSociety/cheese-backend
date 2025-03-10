/*
 *  Description: This file implements the groups controller.
 *               It is responsible for handling the requests to /groups/...
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
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
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { GroupPageDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  NoAuth,
  TokenValidateInterceptor,
} from '../common/interceptor/token-validate.interceptor';
import { CreateGroupDto } from './DTO/create-group.dto';
import { GetGroupsResponseDto } from './DTO/get-groups.dto';
import { GetGroupMembersResponseDto } from './DTO/get-members.dto';
import { GetGroupQuestionsResponseDto } from './DTO/get-questions.dto';
import { GroupResponseDto } from './DTO/group.dto';
import { JoinGroupDto, JoinGroupResponseDto } from './DTO/join-group.dto';
import { QuitGroupResponseDto } from './DTO/quit-group.dto';
import { UpdateGroupDto } from './DTO/update-group.dto';
import { GroupsService } from './groups.service';

@Controller('/groups')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class GroupsController {
  constructor(
    private readonly authService: AuthService,
    private readonly groupsService: GroupsService,
  ) {}

  @Post('/')
  @NoAuth()
  async createGroup(
    @Body() { name, intro, avatarId }: CreateGroupDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GroupResponseDto> {
    const userId = this.authService.verify(auth).userId;
    const group = await this.groupsService.createGroup(
      name,
      userId,
      intro,
      avatarId,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 201,
      message: 'Group created successfully',
      data: { group },
    };
  }

  @Get('/')
  @NoAuth()
  async getGroups(
    @Query() { q: key, page_start, page_size, type }: GroupPageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetGroupsResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const [groups, page] = await this.groupsService.getGroups(
      userId,
      key,
      page_start,
      page_size,
      type,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Groups fetched successfully.',
      data: {
        groups,
        page,
      },
    };
  }

  @Get('/:id')
  @NoAuth()
  async getGroupDetail(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GroupResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const group = await this.groupsService.getGroupDtoById(
      userId,
      id,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Group fetched successfully.',
      data: { group },
    };
  }

  @Put('/:id')
  @NoAuth()
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: UpdateGroupDto,
  ): Promise<BaseResponseDto> {
    const userId = this.authService.verify(auth).userId;
    await this.groupsService.updateGroup(
      userId,
      id,
      req.name,
      req.intro,
      req.avatarId,
    );
    return {
      code: 200,
      message: 'Group updated successfully.',
    };
  }

  @Delete('/:id')
  @NoAuth()
  async deleteGroup(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<void> {
    const userId = this.authService.verify(auth).userId;
    await this.groupsService.deleteGroup(userId, id);
  }

  @Get('/:id/members')
  @NoAuth()
  async getGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start, page_size }: GroupPageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetGroupMembersResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const [members, page] = await this.groupsService.getGroupMembers(
      id,
      page_start,
      page_size,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Group members fetched successfully.',
      data: {
        members,
        page,
      },
    };
  }

  @Post('/:id/members')
  @NoAuth()
  async joinGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() { intro }: JoinGroupDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<JoinGroupResponseDto> {
    const userId = this.authService.verify(auth).userId;
    const joinResult = await this.groupsService.joinGroup(
      userId,
      groupId,
      intro,
    );
    return {
      code: 201,
      message: 'Joined group successfully.',
      data: joinResult,
    };
  }

  @Delete('/:id/members')
  @NoAuth()
  async quitGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<QuitGroupResponseDto> {
    const userId = this.authService.verify(auth).userId;
    const member_count = await this.groupsService.quitGroup(userId, groupId);
    return {
      code: 200,
      message: 'Quit group successfully.',
      data: { member_count },
    };
  }

  @Get('/:id/questions')
  @NoAuth()
  async getGroupQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start, page_size }: GroupPageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
  ): Promise<GetGroupQuestionsResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const getGroupQuestionsResult = await this.groupsService.getGroupQuestions(
      id,
      page_start,
      page_size,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Group questions fetched successfully.',
      data: getGroupQuestionsResult,
    };
  }

  // todo: group targets
}

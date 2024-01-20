import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { CreateGroupDto } from './DTO/create-group.dto';
import { GetGroupsRespondDto } from './DTO/get-groups.dto';
import { GetGroupMembersRespondDto } from './DTO/get-members.dto';
import { GetGroupQuestionsRespondDto } from './DTO/get-questions.dto';
import { GroupRespondDto } from './DTO/group.dto';
import { JoinGroupDto, JoinGroupRespondDto } from './DTO/join-group.dto';
import { QuitGroupRespondDto } from './DTO/quit-group.dto';
import { UpdateGroupDto, UpdateGroupRespondDto } from './DTO/update-group.dto';
import { GroupQueryType, GroupsService } from './groups.service';

@Controller('/groups')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class GroupsController {
  constructor(
    private readonly authService: AuthService,
    private readonly groupsService: GroupsService,
  ) { }

  @Post('/')
  async createGroup(
    @Body() req: CreateGroupDto,
    @Headers('Authorization') auth: string,
  ): Promise<GroupRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const groupDto = await this.groupsService.createGroup(
      req.name,
      userId,
      req.intro,
      req.avatar,
    );
    return {
      code: 200,
      message: 'Group created successfully.',
      data: groupDto,
    };
  }

  @Get('/')
  async getGroups(
    @Query('q') key?: string,
    @Query('page_start') page_start?: number,
    @Query('page_size') page_size: number = 20,
    @Query('type') type: GroupQueryType = GroupQueryType.Recommend,
  ): Promise<GetGroupsRespondDto> {
    const groups = await this.groupsService.getGroups(page, size, key, type);
    return {
      code: 200,
      message: 'Groups fetched successfully.',
      data: {
        groups,
        page
      },
    };
  }

  @Get('/:id')
  async getGroupDetail(
    @Param('id', ParseIntPipe) id: number
  ): Promise<GroupRespondDto> {
    const group = await this.groupsService.getGroupById(id);
    return {
      code: 200,
      message: 'Group fetched successfully.',
      data: group,
    };
  }

  @Put('/:id')
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto
  ): Promise<UpdateGroupRespondDto> {
    const group = await this.groupsService.updateGroup(
      id,
      updateGroupDto.name,
      updateGroupDto.intro,
      updateGroupDto.avatar,
    );
    return {
      code: 200,
      message: 'Group updated successfully.',
    };
  }

  @Delete('/:id')
  async deleteGroup(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseRespondDto> {
    await this.groupsService.deleteGroup(id);
    return {
      code: 204,
      message: 'No Content.'
    };
  }

  @Get('/:id/members')
  async getGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page_start') page_start?: number,
    @Query('page_size') page_size: number = 20,
  ): Promise<GetGroupMembersRespondDto> {
    const members = await this.groupsService.getGroupMembers(id, page, size);
    return {
      code: 200,
      message: 'Group members fetched successfully.',
      data: {
        members,
        page
      },
    };
  }

  @Post('/:id/members')
  async joinGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() joinGroupDto: JoinGroupDto
  ): Promise<JoinGroupRespondDto> {
    const user = await this.authService.getUserFromSession(
      this.sessionService.getSession(),
    );
    const group = await this.groupsService.joinGroup(
      id,
      user.id,
      joinGroupDto.intro,
    );
    return {
      code: 200,
      message: 'Joined group successfully.',
      data: {
        group,
      },
    };
  }

  @Delete('/:id/members')
  async quitGroup(
    @Param('id', ParseIntPipe) id: number
  ): Promise<QuitGroupRespondDto> {
    const user = await this.authService.getUserFromSession(
      this.sessionService.getSession(),
    );
    const group = await this.groupsService.quitGroup(id, user.id);
    return {
      code: 200,
      message: 'Quit group successfully.',
      data: {
        group,
      },
    };
  }

  @Get('/:id/questions')
  async getGroupQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Query('page_start') page_start?: number,
    @Query('page_size') page_size: number = 20,
  ): Promise<GetGroupQuestionsRespondDto> {
    const questions = await this.groupsService.getGroupQuestions(
      id,
      page,
      size,
    );
    return {
      code: 200,
      message: 'Group questions fetched successfully.',
      data: {
        questions,
        page
      },
    };
  }

  // todo: group targets
}

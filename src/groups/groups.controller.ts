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
    const getGroupResult = await this.groupsService.getGroups(
      key,
      page_start,
      page_size,
      type,
    );
    return {
      code: 200,
      message: 'Groups fetched successfully.',
      data: getGroupResult,
    };
  }

  @Get('/:id')
  async getGroupDetail(
    @Param('id', ParseIntPipe) id: number
  ): Promise<GroupRespondDto> {
    const groupDto = await this.groupsService.getGroupDtoById(id);
    return {
      code: 200,
      message: 'Group fetched successfully.',
      data: groupDto,
    };
  }

  @Put('/:id')
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
    @Body() req: UpdateGroupDto,
  ): Promise<UpdateGroupRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.groupsService.updateGroup(
      userId, id, req.name, req.intro, req.avatar);
    return {
      code: 200,
      message: 'Group updated successfully.',
    };
  }

  @Delete('/:id')
  async deleteGroup(
    @Headers('Authorization') auth: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.groupsService.deleteGroup(userId, id);
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
    const getGroupMembersResult = await this.groupsService.getGroupMembers(
      id,
      page_start,
      page_size,
    );
    return {
      code: 200,
      message: 'Group members fetched successfully.',
      data: getGroupMembersResult
    };
  }

  @Post('/:id/members')
  async joinGroup(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
    @Body() joinGroupDto: JoinGroupDto,
  ): Promise<JoinGroupRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const joinResult = await this.groupsService.joinGroup(
      id,
      userId,
      joinGroupDto.intro,
    );
    return {
      code: 200,
      message: 'Joined group successfully.',
      data: joinResult,
    };
  }

  @Delete('/:id/members')
  async quitGroup(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
  ): Promise<QuitGroupRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const member_count = await this.groupsService.quitGroup(id, userId);
    return {
      code: 200,
      message: 'Quit group successfully.',
      data: { member_count }
    };
  }

  @Get('/:id/questions')
  async getGroupQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Query('page_start') page_start?: number,
    @Query('page_size') page_size: number = 20,
  ): Promise<GetGroupQuestionsRespondDto> {
    const getGroupQuestionsResult = await this.groupsService.getGroupQuestions(
      id,
      page_start,
      page_size,
    );
    return {
      code: 200,
      message: 'Group questions fetched successfully.',
      data: getGroupQuestionsResult
    };
  }

  // todo: group targets
}
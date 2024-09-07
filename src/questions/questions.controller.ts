/*
 *  Description: This file implements the questions controller.
 *               It is responsible for handling the requests to /questions/...
 *               However, it's not responsible for /questions/{id}/answers/...
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *      Andy Lee        <andylizf@outlook.com>
 *      HuanCheng65
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
import { AttitudeTypeDto } from '../attitude/DTO/attitude.dto';
import { UpdateAttitudeResponseDto } from '../attitude/DTO/update-attitude.dto';
import { AuthService } from '../auth/auth.service';
import { UserId } from '../auth/user-id.decorator';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { PageDto, PageWithKeywordDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import {
  ParseSortPatternPipe,
  SortPattern,
} from '../common/pipe/parse-sort-pattern.pipe';
import { SnakeCaseToCamelCasePipe } from '../common/pipe/snake-case-to-camel-case.pipe';
import {
  AddQuestionRequestDto,
  AddQuestionResponseDto,
} from './DTO/add-question.dto';
import {
  FollowQuestionResponseDto,
  UnfollowQuestionResponseDto,
} from './DTO/follow-unfollow-question.dto';
import { GetQuestionInvitationDetailResponseDto } from './DTO/get-invitation-detail.dto';
import { GetQuestionFollowerResponseDto } from './DTO/get-question-follower.dto';
import { GetQuestionInvitationsResponseDto } from './DTO/get-question-invitation.dto';
import { GetQuestionRecommendationsResponseDto } from './DTO/get-question-recommendations.dto';
import { GetQuestionResponseDto } from './DTO/get-question.dto';
import {
  InviteUsersAnswerRequestDto,
  InviteUsersAnswerResponseDto,
} from './DTO/invite-user-answer.dto';
import { SearchQuestionResponseDto } from './DTO/search-question.dto';
import { SetBountyDto } from './DTO/set-bounty.dto';
import { UpdateQuestionRequestDto } from './DTO/update-question.dto';
import { QuestionsService } from './questions.service';
import {
  AuthToken,
  CurrentUserOwnResource,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';

@Controller('/questions')
export class QuestionsController {
  constructor(
    readonly questionsService: QuestionsService,
    readonly authService: AuthService,
  ) {}

  @ResourceOwnerIdGetter('question')
  async getQuestionOwner(id: number): Promise<number> {
    return this.questionsService.getQuestionCreatedById(id);
  }

  @Get('/')
  @Guard('enumerate', 'question')
  async searchQuestion(
    @Query()
    { q, page_start: pageStart, page_size: pageSize }: PageWithKeywordDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() searcherId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchQuestionResponseDto> {
    const [questions, pageRespond] =
      await this.questionsService.searchQuestions(
        q ?? '',
        pageStart,
        pageSize,
        searcherId,
        ip,
        userAgent,
      );
    return {
      code: 200,
      message: 'OK',
      data: {
        questions,
        page: pageRespond,
      },
    };
  }

  @Post('/')
  @Guard('create', 'question')
  @CurrentUserOwnResource()
  async addQuestion(
    @Body()
    { title, content, type, topics, groupId, bounty }: AddQuestionRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<AddQuestionResponseDto> {
    const questionId = await this.questionsService.addQuestion(
      userId,
      title,
      content,
      type,
      topics,
      groupId,
      bounty,
    );
    return {
      code: 201,
      message: 'Created',
      data: {
        id: questionId,
      },
    };
  }

  @Get('/:id')
  @Guard('query', 'question')
  async getQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionResponseDto> {
    const questionDto = await this.questionsService.getQuestionDto(
      id,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'OK',
      data: {
        question: questionDto,
      },
    };
  }

  @Put('/:id')
  @Guard('modify', 'question')
  async updateQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Body() { title, content, type, topics }: UpdateQuestionRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<BaseResponseDto> {
    await this.questionsService.updateQuestion(
      id,
      title,
      content,
      type,
      topics,
      this.authService.verify(auth).userId,
    );
    return {
      code: 200,
      message: 'OK',
    };
  }

  @Delete('/:id')
  @Guard('delete', 'question')
  async deleteQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<void> {
    await this.questionsService.deleteQuestion(id);
  }

  @Get('/:id/followers')
  @Guard('enumerate-followers', 'question')
  async getQuestionFollowers(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionFollowerResponseDto> {
    const [followers, pageRespond] =
      await this.questionsService.getQuestionFollowers(
        id,
        pageStart,
        pageSize,
        userId,
        ip,
        userAgent,
      );
    return {
      code: 200,
      message: 'OK',
      data: {
        users: followers,
        page: pageRespond,
      },
    };
  }

  @Post('/:id/followers')
  @Guard('follow', 'question')
  async followQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<FollowQuestionResponseDto> {
    await this.questionsService.followQuestion(userId, id);
    return {
      code: 201,
      message: 'OK',
      data: {
        follow_count: await this.questionsService.getFollowCountOfQuestion(id),
      },
    };
  }

  @Delete('/:id/followers')
  @Guard('unfollow', 'question')
  async unfollowQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<UnfollowQuestionResponseDto> {
    await this.questionsService.unfollowQuestion(userId, id);
    return {
      code: 200,
      message: 'OK',
      data: {
        follow_count: await this.questionsService.getFollowCountOfQuestion(id),
      },
    };
  }

  @Post('/:id/attitudes')
  @Guard('attitude', 'question')
  async updateAttitudeToQuestion(
    @Param('id', ParseIntPipe) @ResourceId() questionId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<UpdateAttitudeResponseDto> {
    const attitudes = await this.questionsService.setAttitudeToQuestion(
      questionId,
      userId,
      attitudeType,
    );
    return {
      code: 201,
      message: 'You have expressed your attitude towards the question',
      data: {
        attitudes,
      },
    };
  }

  @Get('/:id/invitations')
  @Guard('enumerate-invitations', 'question')
  async getQuestionInvitations(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Query(
      'sort',
      new SnakeCaseToCamelCasePipe({ prefixIgnorePattern: '[+-]' }),
      new ParseSortPatternPipe({
        optional: true,
        allowedFields: ['createdAt'],
      }),
    )
    sort: SortPattern = { createdAt: 'desc' },
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionInvitationsResponseDto> {
    const [invitations, page] =
      await this.questionsService.getQuestionInvitations(
        id,
        sort,
        pageStart,
        pageSize,
        userId,
        ip,
        userAgent,
      );
    return {
      code: 200,
      message: 'OK',
      data: {
        invitations,
        page,
      },
    };
  }

  @Post('/:id/invitations')
  @Guard('invite', 'question')
  async inviteUserAnswerQuestion(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Body() { user_id: invitedUserId }: InviteUsersAnswerRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<InviteUsersAnswerResponseDto> {
    const inviteId = await this.questionsService.inviteUsersToAnswerQuestion(
      id,
      invitedUserId,
    );
    return {
      code: 201,
      message: 'Invited',
      data: {
        invitationId: inviteId,
      },
    };
  }

  @Delete('/:id/invitations/:invitation_id')
  @Guard('uninvite', 'question')
  async cancelInvition(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Param('invitation_id', ParseIntPipe) invitationId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<BaseResponseDto> {
    await this.questionsService.cancelInvitation(id, invitationId);
    return {
      code: 204,
      message: 'successfully cancelled',
    };
  }

  //! The static route `/:id/invitations/recommendations` should come
  //! before the dynamic route `/:id/invitations/:invitation_id`
  //! so that it is not overridden.
  @Get('/:id/invitations/recommendations')
  @Guard('query-invitation-recommendations', 'question')
  async getRecommendations(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query('page_size')
    pageSize: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionRecommendationsResponseDto> {
    const users =
      await this.questionsService.getQuestionInvitationRecommendations(
        id,
        pageSize,
        userId,
        ip,
        userAgent,
      );
    return {
      code: 200,
      message: 'successfully',
      data: {
        users,
      },
    };
  }

  @Get('/:id/invitations/:invitation_id')
  @Guard('query-invitation', 'question')
  async getInvitationDetail(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Param('invitation_id', ParseIntPipe) invitationId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionInvitationDetailResponseDto> {
    const invitationDto = await this.questionsService.getQuestionInvitationDto(
      id,
      invitationId,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'successfully',
      data: {
        invitation: invitationDto,
      },
    };
  }

  @Put('/:id/bounty')
  @Guard('set-bounty', 'question')
  async setBounty(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @Body() { bounty }: SetBountyDto,
  ): Promise<BaseResponseDto> {
    await this.questionsService.setBounty(id, bounty);
    return {
      code: 200,
      message: 'OK',
    };
  }

  @Put('/:id/acceptance')
  @Guard('accept-answer', 'question')
  async acceptAnswer(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Query('answer_id', ParseIntPipe) answer_id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<BaseResponseDto> {
    await this.questionsService.acceptAnswer(id, answer_id);
    return {
      code: 200,
      message: 'OK',
    };
  }
}

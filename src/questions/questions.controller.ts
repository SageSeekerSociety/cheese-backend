/*
 *  Description: This file implements the questions controller.
 *               It is responsible for handling the requests to /questions/...
 *               However, it's not responsible for /questions/{id}/answers/...
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
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { AttitudeTypeDto } from '../attitude/DTO/attitude.dto';
import { UpdateAttitudeRespondDto } from '../attitude/DTO/update-attitude.dto';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
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
import { GetQuestionRecommendationsRespondDto } from './DTO/get-question-recommendations.dto';
import { GetQuestionResponseDto } from './DTO/get-question.dto';
import {
  InviteUsersAnswerRequestDto,
  InviteUsersAnswerResponseDto,
} from './DTO/invite-user-answer.dto';
import { SearchQuestionResponseDto } from './DTO/search-question.dto';
import { UpdateQuestionRequestDto } from './DTO/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('/questions')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class QuestionsController {
  constructor(
    readonly questionsService: QuestionsService,
    readonly authService: AuthService,
  ) {}

  @Get('/')
  async searchQuestion(
    @Query()
    { q, page_start: pageStart, page_size: pageSize }: PageWithKeywordDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchQuestionResponseDto> {
    // try get viewer id
    let searcherId: number | undefined;
    try {
      searcherId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
    const [questions, pageRespond] =
      await this.questionsService.searchQuestions(
        q,
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
  async addQuestion(
    @Body() { title, content, type, topics, groupId }: AddQuestionRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AddQuestionResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'questions',
      undefined,
    );
    const questionId = await this.questionsService.addQuestion(
      userId,
      title,
      content,
      type,
      topics,
      groupId,
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
  async getQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() { title, content, type, topics }: UpdateQuestionRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.modify,
      await this.questionsService.getQuestionCreatedById(id),
      'questions',
      id,
    );
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
  async deleteQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      await this.questionsService.getQuestionCreatedById(id),
      'questions',
      id,
    );
    await this.questionsService.deleteQuestion(id);
    return {
      code: 200,
      message: 'OK',
    };
  }

  @Get('/:id/followers')
  async getQuestionFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionFollowerResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
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
  async followQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<FollowQuestionResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'questions/following',
      id,
    );
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
  async unfollowQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UnfollowQuestionResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      userId,
      'questions/following',
      id,
    );
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
  async updateAttitudeToQuestion(
    @Param('id', ParseIntPipe) questionId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UpdateAttitudeRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.questionsService.getQuestionCreatedById(questionId),
      'questions/attitude',
      questionId,
    );
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
  async getQuestionInvitations(
    @Param('id', ParseIntPipe) id: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Query(
      'sort',
      new SnakeCaseToCamelCasePipe({ prefixIgnorePattern: '[+-]' }),
      new ParseSortPatternPipe({
        optional: true,
        allowedFields: ['createdAt'],
      }),
    )
    sort: SortPattern = { createdAt: 'desc' },
  ): Promise<GetQuestionInvitationsResponseDto> {
    const [invitations, page] =
      await this.questionsService.getQuestionInvitations(
        id,
        sort,
        pageStart,
        pageSize,
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
  async inviteUserAnswerQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() { user_id: invitedUserId }: InviteUsersAnswerRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<InviteUsersAnswerResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'questions/invitation',
      undefined,
    );
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
  async cancelInvition(
    @Param('id', ParseIntPipe) id: number,
    @Param('invitation_id', ParseIntPipe) invitationId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      await this.questionsService.getInvitedById(id, invitationId),
      'questions/invitation',
      invitationId,
    );
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
  async getRecommendations(
    @Param('id', ParseIntPipe) id: number,
    @Query('page_size')
    pageSize: number,
  ): Promise<GetQuestionRecommendationsRespondDto> {
    const users =
      await this.questionsService.getQuestionInvitationRecommendations(
        id,
        pageSize,
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
  async getInvitationDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('invitation_id', ParseIntPipe) invitationId: number,
  ): Promise<GetQuestionInvitationDetailResponseDto> {
    const invitationDto = await this.questionsService.getQuestionInvitationDto(
      id,
      invitationId,
    );
    return {
      code: 200,
      message: 'successfully',
      data: {
        invitation: invitationDto,
      },
    };
  }
}

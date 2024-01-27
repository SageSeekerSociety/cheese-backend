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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { unescape } from 'querystring';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  AddQuestionRequestDto,
  AddQuestionResponseDto,
} from './DTO/add-question.dto';
import {
  FollowQuestionResponseDto,
  UnfollowQuestionResponseDto,
} from './DTO/follow-unfollow-question.dto';
import { GetQuestionFollowerResponseDto } from './DTO/get-question-follower.dto';
import { GetQuestionResponseDto } from './DTO/get-question.dto';
import { SearchQuestionResponseDto } from './DTO/search-question.dto';
import { UpdateQuestionRequestDto } from './DTO/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('/questions')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  async searchQuestion(
    @Query('q') q: string,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number,
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchQuestionResponseDto> {
    if (pageSize == null || pageSize == 0) pageSize = 20;
    // try get viewer id
    var searcherId: number = null;
    try {
      searcherId = this.authService.verify(auth).userId;
    } catch {}
    const [questions, pageRespond] =
      await this.questionsService.searchQuestions(
        unescape(q),
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
    @Body() body: AddQuestionRequestDto,
    @Headers('Authorization') auth: string,
  ): Promise<AddQuestionResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'questions',
      null,
    );
    const questionId = await this.questionsService.addQuestion(
      userId,
      body.title,
      body.content,
      body.type,
      body.topics,
      body.groupId,
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
    @Param('id') id: number,
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionResponseDto> {
    let userId: number;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {}
    const questionDto = await this.questionsService.getQuestionDto(
      id,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'OK',
      data: questionDto,
    };
  }

  @Put('/:id')
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateQuestionRequestDto,
    @Headers('Authorization') auth: string,
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
      body.title,
      body.content,
      body.type,
      body.topics,
    );
    return {
      code: 200,
      message: 'OK',
    };
  }

  @Delete('/:id')
  async deleteQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
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
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number,
    @Query('page_size', new ParseIntPipe({ optional: true })) pageSize: number,
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetQuestionFollowerResponseDto> {
    if (pageSize == null || pageSize == 0) pageSize = 20;
    let userId: number;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {}
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

  @Put('/:id/followers')
  async followQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
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
      code: 200,
      message: 'OK',
      data: {
        follow_count: await this.questionsService.getFollowCountOfQuestion(id),
      },
    };
  }

  @Delete('/:id/followers')
  async unfollowQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string,
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
}

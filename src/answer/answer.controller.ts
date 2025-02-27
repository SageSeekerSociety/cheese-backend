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
} from '@nestjs/common';
import { AttitudeTypeDto } from '../attitude/DTO/attitude.dto';
import { UpdateAttitudeResponseDto } from '../attitude/DTO/update-attitude.dto';
import { AuthService } from '../auth/auth.service';
import {
  AuthToken,
  CurrentUserOwnResource,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';
import { UserId } from '../auth/user-id.decorator';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { PageDto } from '../common/DTO/page.dto';
import { QuestionsService } from '../questions/questions.service';
import { CreateAnswerResponseDto } from './DTO/create-answer.dto';
import { GetAnswerDetailResponseDto } from './DTO/get-answer-detail.dto';
import { GetAnswersResponseDto } from './DTO/get-answers.dto';
import { UpdateAnswerRequestDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';

@Controller('/questions/:question_id/answers')
export class AnswerController {
  constructor(
    private readonly authService: AuthService,
    private readonly answerService: AnswerService,
    private readonly questionsService: QuestionsService,
  ) {}

  @ResourceOwnerIdGetter('answer')
  async getAnswerOwner(answerId: number): Promise<number | undefined> {
    return this.answerService.getCreatedByIdAcrossQuestions(answerId);
  }

  @ResourceOwnerIdGetter('question')
  async getQuestionOwner(questionId: number): Promise<number | undefined> {
    return this.questionsService.getQuestionCreatedById(questionId);
  }

  @Get('/')
  @Guard('enumerate-answers', 'question')
  async getQuestionAnswers(
    @Param('question_id', ParseIntPipe) @ResourceId() questionId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAnswersResponseDto> {
    const [answers, page] = await this.answerService.getQuestionAnswers(
      questionId,
      pageStart,
      pageSize,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Answers fetched successfully.',
      data: {
        answers,
        page,
      },
    };
  }

  @Post('/')
  @Guard('create', 'answer')
  @CurrentUserOwnResource()
  async answerQuestion(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Body('content') content: string,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<CreateAnswerResponseDto> {
    const answerId = await this.answerService.createAnswer(
      questionId,
      userId,
      content,
    );
    return {
      code: 201,
      message: 'Answer created successfully.',
      data: {
        id: answerId,
      },
    };
  }

  @Get('/:answer_id')
  @Guard('query', 'answer')
  async getAnswerDetail(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAnswerDetailResponseDto> {
    const answerDto = await this.answerService.getAnswerDto(
      questionId,
      answerId,
      userId,
      ip,
      userAgent,
    );
    const questionDto = await this.questionsService.getQuestionDto(
      answerDto.question_id,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Answer fetched successfully.',
      data: {
        question: questionDto,
        answer: answerDto,
      },
    };
  }

  @Put('/:answer_id')
  @Guard('modify', 'answer')
  async updateAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Body() { content }: UpdateAnswerRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<BaseResponseDto> {
    await this.answerService.updateAnswer(
      questionId,
      answerId,
      content,
      userId,
    );
    return {
      code: 200,
      message: 'Answer updated successfully.',
    };
  }

  @Delete('/:answer_id')
  @Guard('delete', 'answer')
  async deleteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<void> {
    await this.answerService.deleteAnswer(questionId, answerId, userId);
  }

  @Post('/:answer_id/attitudes')
  @Guard('attitude', 'answer')
  async updateAttitudeToAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<UpdateAttitudeResponseDto> {
    const attitudes = await this.answerService.setAttitudeToAnswer(
      questionId,
      answerId,
      userId,
      attitudeType,
    );
    return {
      code: 201,
      message: 'You have expressed your attitude towards the answer',
      data: {
        attitudes,
      },
    };
  }

  @Put('/:answer_id/favorite')
  @Guard('favorite', 'answer')
  async favoriteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<BaseResponseDto> {
    await this.answerService.favoriteAnswer(questionId, answerId, userId);
    return {
      code: 200,
      message: 'Answer favorited successfully.',
    };
  }

  @Delete('/:answer_id/favorite')
  @Guard('unfavorite', 'answer')
  async unfavoriteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) @ResourceId() answerId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<void> {
    await this.answerService.unfavoriteAnswer(questionId, answerId, userId);
  }
}

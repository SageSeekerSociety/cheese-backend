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
import { PageDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { QuestionsService } from '../questions/questions.service';
import { CreateAnswerRespondDto } from './DTO/create-answer.dto';
import { GetAnswerDetailRespondDto } from './DTO/get-answer-detail.dto';
import { GetAnswersRespondDto } from './DTO/get-answers.dto';
import { UpdateAnswerRequestDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';

@Controller('/questions/:question_id/answers')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class AnswerController {
  constructor(
    private readonly authService: AuthService,
    private readonly answerService: AnswerService,
    private readonly questionsService: QuestionsService,
  ) {}

  @Get('/')
  async getQuestionAnswers(
    @Param('question_id') questionId: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAnswersRespondDto> {
    let userId: number | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
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
  async answerQuestion(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CreateAnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'answer',
      undefined,
    );
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
  async getAnswerDetail(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetAnswerDetailRespondDto> {
    let userId;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
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
  async updateAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Body() { content }: UpdateAnswerRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.modify,
      await this.answerService.getCreatedById(questionId, answerId),
      'answer',
      questionId,
    );
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
  async deleteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      await this.answerService.getCreatedById(questionId, answerId),
      'answer',
      answerId,
    );
    await this.answerService.deleteAnswer(questionId, answerId, userId);
    return {
      code: 200,
      message: 'Answer deleted successfully.',
    };
  }

  @Post('/:answer_id/attitudes')
  async updateAttitudeToAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UpdateAttitudeRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.answerService.getCreatedById(questionId, answerId),
      'answer/attitude',
      answerId,
    );
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
  async favoriteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.answerService.getCreatedById(questionId, answerId),
      'answer/favourite',
      answerId,
    );
    await this.answerService.favoriteAnswer(questionId, answerId, userId);
    return {
      code: 200,
      message: 'Answer favorited successfully.',
    };
  }

  @Delete('/:answer_id/favorite')
  async unfavoriteAnswer(
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.answerService.getCreatedById(questionId, answerId),
      'answer/favourite',
      answerId,
    );
    await this.answerService.unfavoriteAnswer(questionId, answerId, userId);
    return {
      code: 204,
      message: 'No Content',
    };
  }
}

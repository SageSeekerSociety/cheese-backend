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
import { UpdateAttitudeRespondDto } from '../attitude/DTO/update-attitude.dto';
import { parseAttitude } from '../attitude/attitude.enum';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { QuestionsService } from '../questions/questions.service';
import { CreateAnswerRespondDto } from './DTO/create-answer.dto';
import { GetAnswerDetailRespondDto } from './DTO/get-answer-detail.dto';
import { GetAnswersRespondDto } from './DTO/get-answers.dto';
import { UpdateAnswerRequestDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';

@Controller('/questions/:question_id/answers')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class AnswerController {
  constructor(
    private readonly authService: AuthService,
    private readonly answerService: AnswerService,
    private readonly questionsService: QuestionsService,
  ) {}

  @Get('/')
  async getQuestionAnswers(
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
    @Param('question_id', ParseIntPipe) questionId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
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
      userAgent,
      ip,
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
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
    @Param('question_id', ParseIntPipe) questionId: number,
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
    @Headers('Authorization') auth: string | undefined,
    @Param('question_id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
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
      userAgent,
      ip,
    );
    const questionDto = await this.questionsService.getQuestionDto(
      answerDto.question_id,
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
    @Headers('Authorization') auth: string | undefined,
    @Body() req: UpdateAnswerRequestDto,
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
      req.content,
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
    @Body('attitude_type') attitude: string,
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
      parseAttitude(attitude),
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

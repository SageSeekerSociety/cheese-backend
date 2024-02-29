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
import { AuthService } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { QuestionsService } from '../questions/questions.service';
import {
  AgreeAnswerRequestDto,
  AgreeAnswerRespondDto,
} from './DTO/agree-answer.dto';
import { CreateAnswerRespondDto } from './DTO/create-answer.dto';
import { GetAnswerDetailRespondDto } from './DTO/get-answer-detail.dto';
import { GetAnswersRespondDto } from './DTO/get-answers.dto';
import { UpdateAnswerRequestDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';
@Controller('/question/:id/answers')
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
    @Param('id', ParseIntPipe) id: number,
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
      id,
      pageStart ?? undefined,
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
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreateAnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const answerId = await this.answerService.createAnswer(id, userId, content);
    return {
      code: 200,
      message: 'Answer created successfully.',
      data: {
        id: answerId,
      },
    };
  }

  @Get('/:answer_id')
  async getAnswerDetail(
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) id: number,
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
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: UpdateAnswerRequestDto,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.updateAnswer(userId, answerId, req.content);
    return {
      code: 200,
      message: 'Answer updated successfully.',
    };
  }

  @Delete('/:answer_id')
  async deleteAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.deleteAnswer(answerId, userId);
    return {
      code: 200,
      message: 'Answer deleted successfully.',
    };
  }

  @Put('/:answer_id/agree')
  async agreeAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: AgreeAnswerRequestDto,
  ): Promise<AgreeAnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.agreeAnswer(answerId, userId, req.agree_type);
    return {
      code: 200,
      message: 'Answer agreed successfully.',
      data: {
        agree_count: await this.answerService.getAgreeCount(answerId),
      },
    };
  }

  @Put('/:answer_id/favorite')
  async favoriteAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.favoriteAnswer(answerId, userId);
    return {
      code: 200,
      message: 'Answer favorited successfully.',
    };
  }

  @Delete('/:answer_id/favorite')
  async unfavoriteAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.unfavoriteAnswer(answerId, userId);
    return {
      code: 200,
      message: 'Answer unfavorited successfully.',
    };
  }
}
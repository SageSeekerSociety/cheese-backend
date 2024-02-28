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
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { AgreeAnswerDto, AgreeAnswerRespondDto } from './DTO/agree-answer.dto';
import { AnswerDetailRespondDto, AnswerRespondDto } from './DTO/answer.dto';
import { FavoriteAnswersRespondDto } from './DTO/favorite-answer.dto';
import { GetAnswersRespondDto } from './DTO/get-answers.dto';
import {
  UpdateAnswerDto,
  UpdateRespondAnswerDto,
} from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';
@Controller('/question/:id/answers')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class AnswerController {
  constructor(
    private readonly authService: AuthService,
    private readonly answerService: AnswerService,
  ) {}

  @Get('/')
  async getQuestionAnswers(
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    page_start?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    page_size: number = 20,
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
      page_start ?? undefined,
      page_size,
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
  ): Promise<AnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const answerId = await this.answerService.createAnswer(id, userId, content);
    const answerDto = await this.answerService.getAnswerById(
      userId,
      id,
      answerId,
    );
    //注意到一个比较抽象的问题，就你在service里面create的时候，你是没有用到questionId的对吧
    //所以你存储的时候，也没有这个东西，但是你上面getAnwerById你还用上了id，那咋可能找得到
    return {
      code: 200,
      message: 'Answer created successfully.',
      data: answerDto,
    };
  }

  @Get('/:answer_id')
  async getAnswerDetail(
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answer_id: number,
  ): Promise<AnswerDetailRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const answerDto = await this.answerService.getAnswerById(
      userId,
      id,
      answer_id,
    );
    return {
      code: 200,
      message: 'Answer fetched successfully.',
      data: answerDto,
    };
  }

  @Put('/:answer_id')
  async updateAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answer_id: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: UpdateAnswerDto,
  ): Promise<UpdateRespondAnswerDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.updateAnswer(userId, answer_id, req.content);
    return {
      code: 200,
      message: 'Answer updated successfully.',
    };
  }

  @Delete('/:answer_id')
  async deleteAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answer_id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.deleteAnswer(userId, id, answer_id);
    return {
      code: 200,
      message: 'Answer deleted successfully.',
    };
  }

  @Put('/:answer_id/agree')
  async agreeAnswer(
    @Param('answer_id', ParseIntPipe) answer_id: number,
    // @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: AgreeAnswerDto,
  ): Promise<AgreeAnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const agreedAnswer = await this.answerService.agreeAnswer(
      answer_id,
      userId,
      req.agree_type,
    );
    return {
      code: 200,
      message: 'Answer agreed successfully.',
      data: agreedAnswer,
    };
  }

  @Put('/:answer_id/favorite')
  async favoriteAnswer(
    @Param('answer_id', ParseIntPipe) answer_id: number,
    // @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<FavoriteAnswersRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const answer = await this.answerService.favoriteAnswer(answer_id, userId);

    return {
      code: 200,
      message: 'Answer favorited successfully.',
      data: { answer },
    };
  }

  @Delete('/:answer_id/favorite')
  async unfavoriteAnswer(
    @Param('answer_id', ParseIntPipe) answer_id: number,
    @Param('id', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.unfavoriteAnswer(answer_id, userId);
    return {
      code: 200,
      message: 'No Content.',
    };
  }
}

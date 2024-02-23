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
import { AnswerRespondDto } from './DTO/answer.dto';
import { CreateAnswerDto } from './DTO/create-answer.dto';
import { FavoriteAnswersRespondDto } from './DTO/favorite-answer.dto';
import { GetAnswersRespondDto } from './DTO/get-answers.dto';
import { UpdateAnswerDto, UpdateRespondAnswerDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';
@Controller('/answers')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class AnswerController {
  constructor(
    private readonly authService: AuthService,
    private readonly answerService: AnswerService,
  ) {}

  @Get('/question/:id/answers')
  async getQuestionAnswers(
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) questionId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    page_start?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    page_size: number = 20,
  ): Promise<GetAnswersRespondDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const [answers, page] = await this.answerService.getQuestionAnswers(
      questionId,
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

  @Post('/question/:id/answers')
  async answerQuestion(
    @Body() req: CreateAnswerDto,
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) questionId: number,
  ):Promise<AnswerRespondDto>{
    const userId = this.authService.verify(auth).userId;
    const answerDto = await this.answerService.createAnswer(
      userId,
      req.content,
    );
    return {
      code: 200,
      message: 'Answer created successfully.',
      data: answerDto,
    };
  }
  
  @Get('/questions/:id/answers/:answer_id')
  async getAnswerDetail(
    @Headers('Authorization') auth: string | undefined,
    @Param('id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
  ): Promise<AnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const  answerDto = await this.answerService.getAnswerById(userId, questionId, answerId);
    return {
      code: 200,
      message: 'Answer fetched successfully.',
      data: answerDto,
    };
  }

  @Put('/questions/:id/answers/:answer_id')
  async updateAnswer(
    @Param('id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: UpdateAnswerDto,
  ): Promise<UpdateRespondAnswerDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.updateAnswer(
      userId,
      answerId,
      req.content,
    );
    return {
      code: 200,
      message: 'Answer updated successfully.',
    };
  }

  @Delete('/questions/:id/answers/:answer_id')
  async deleteAnswer(
    @Param('id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.deleteAnswer(userId, questionId, answerId);
    return {
      code: 200,
      message: 'Answer deleted successfully.',
    }
  }

  @Put('/questions/:id/answers/:answer_id/agree')
  async agreeAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('id', ParseIntPipe) questionId: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() req: AgreeAnswerDto,
  ): Promise<AgreeAnswerRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const agreedAnswer =  await this.answerService.agreeAnswer(answerId, userId, req.agree_type);
    return {
      code: 200,
      message: 'Answer agreed successfully.',
      data: agreedAnswer,
    };
  }
  

  @Put('/questions/:id/answers/:answer_id/favorite')
  async favoriteAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('id', ParseIntPipe) questionId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<FavoriteAnswersRespondDto> {
    const userId = this.authService.verify(auth).userId;
    const answer = await this.answerService.favoriteAnswer(answerId, userId);
    
    return {
      code: 200,
      message: 'Answer favorited successfully.',
      data: { answer },
    };
  }

  @Delete('/questions/:id/answers/:answer_id/favorite')
  async unfavoriteAnswer(
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('id', ParseIntPipe) questionId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    await this.answerService.unfavoriteAnswer(answerId, userId);
    return {
      code: 204,
      message: 'No content.',
    };
  }
}

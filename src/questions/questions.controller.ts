import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { AddQuestionRequestDto } from './DTO/add-question.dto';
import { QuestionsService } from './questions.service';

@Controller('/questions')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly authService: AuthService,
  ) {}

  @Post('/')
  addQuestion(
    @Body() body: AddQuestionRequestDto,
    @Headers('Authorization') auth: string,
  ) {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'questions',
      null,
    );
    // todo
  }
}

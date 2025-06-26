// src/users/content/content.service.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { QuestionsService } from '../../questions/questions.service';
import { AnswerService } from '../../answer/answer.service';
import { PageDto } from '../../common/DTO/page-response.dto';
import { QuestionDto } from '../../questions/DTO/question.dto'; // Assuming QuestionDto is the type for questions
import { AnswerDto } from '../../answer/DTO/answer.dto'; // Assuming AnswerDto is the type for answers

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
  ) {}

  async getUserAskedQuestions(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[QuestionDto[], PageDto]> {
    return this.questionsService.getUserAskedQuestions(
      userId,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
  }

  async getUserAnsweredAnswers(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[AnswerDto[], PageDto]> {
    return this.answerService.getUserAnsweredAnswersAcrossQuestions(
      userId,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
  }

  async getFollowedQuestions(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[QuestionDto[], PageDto]> {
    return this.questionsService.getFollowedQuestions(
      userId,
      pageStart,
      pageSize,
      viewerId,
      ip,
      userAgent,
    );
  }
}

// src/users/content/content.controller.ts
import {
  Controller,
  Get,
  Headers,
  Inject,
  Ip,
  Logger,
  Param,
  ParseIntPipe,
  Query,
  UseFilters,
  forwardRef,
} from '@nestjs/common';

import { AuthToken, Guard, ResourceId } from '../../auth/guard.decorator';
import { UserId } from '../../auth/user-id.decorator';
import { PageDto } from '../../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../../common/error/error-filter';

// DTOs from this module
import { GetAskedQuestionsResponseDto } from './dto/get-asked-questions.dto';
import { GetAnsweredAnswersResponseDto } from './dto/get-answered-answers.dto';
import { GetFollowedQuestionsResponseDto } from './dto/get-followed-questions.dto';

// Service from this module
import { ContentService } from './content.service';
import { ResourceOwnerIdGetter } from '../../auth/guard.decorator'; // Import for Guard

@Controller('/users') // Base path /users, specific content paths like /:id/questions defined in methods
@UseFilters(BaseErrorExceptionFilter)
export class ContentController {
  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    return userId;
  }
  private readonly logger = new Logger(ContentController.name);

  constructor(private readonly contentService: ContentService) {}

  // Define ResourceOwnerIdGetter if Guard('...', 'user') needs it and it's not globally available
  // For these content listing endpoints, the :id in the path is the user whose content is being listed.
  // The Guard will check permissions against this :id.

  @Get('/:id/questions')
  @Guard('enumerate-questions', 'user') // Permission to list questions of user :id
  async getUserAskedQuestions(
    @Param('id', ParseIntPipe) @ResourceId() userIdToList: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @UserId() viewerId: number | undefined, // The user viewing the list
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<GetAskedQuestionsResponseDto> {
    const effectivePageSize = pageSize == undefined || pageSize <= 0 ? 20 : pageSize;
    const [questions, page] = await this.contentService.getUserAskedQuestions(
      userIdToList,
      pageStart,
      effectivePageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query asked questions successfully.',
      data: {
        questions,
        page,
      },
    };
  }

  @Get('/:id/answers')
  @Guard('enumerate-answers', 'user') // Permission to list answers of user :id
  async getUserAnsweredAnswers(
    @Param('id', ParseIntPipe) @ResourceId() userIdToList: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<GetAnsweredAnswersResponseDto> {
    const effectivePageSize = pageSize == undefined || pageSize <= 0 ? 20 : pageSize;
    const [answers, page] = await this.contentService.getUserAnsweredAnswers(
      userIdToList,
      pageStart,
      effectivePageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query answered questions successfully.', // Message was "Query asked questions successfully"
      data: {
        answers,
        page,
      },
    };
  }

  @Get('/:id/follow/questions') // Path to get questions a user is following
  @Guard('enumerate-followed-questions', 'user') // Permission to list questions followed by user :id
  async getFollowedQuestions(
    @Param('id', ParseIntPipe) @ResourceId() userIdToList: number,
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @UserId() viewerId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<GetFollowedQuestionsResponseDto> {
    const effectivePageSize = pageSize == undefined || pageSize <= 0 ? 20 : pageSize;
    const [questions, page] = await this.contentService.getFollowedQuestions(
      userIdToList,
      pageStart,
      effectivePageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followed questions successfully.',
      data: {
        questions,
        page,
      },
    };
  }
}

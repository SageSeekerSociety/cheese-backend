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
  ValidationPipe
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { UserIdNotFoundError } from '../users/users.error';
import {
  AgreeCommentDto,
  AgreeCommentResponseDto,
} from './DTO/agreeComment.dto';
import { CreateCommentResponseDto } from './DTO/comment.dto';
import { DeleteCommentRespondDto } from './DTO/deleteComment.dto';
import { GetCommentsResponseDto } from './DTO/getComments.dto';
import { CommentsService } from './comment.service';

@Controller('/comments')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/:commentableType/:commentableId')
  async getComments(
    @Param('commentableType') commentableType: 'answer'|'question'|'comment',
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
  ): Promise<GetCommentsResponseDto> {
    const commentData = (
      await this.commentsService.getComments(commentableId, pageStart, pageSize)
    ).data.comments;
    const page = (
      await this.commentsService.getComments(commentableId, pageStart, pageSize)
    ).data.page;
    return {
      code: 200,
      message: 'Get comments successfully',
      data: {
        comments: commentData,
        page,
      },
    };
  }

  // 咋成body了 应该是/:commentableType/:commentableId啊
  // 然后@Params('commentableType')
  @Post('/:commentableType/:commentableId')
  async createComment(
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Param('commentableType')
    commentableType: 'comment' | 'answer' | 'question',
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CreateCommentResponseDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new UserIdNotFoundError(userId);
    }

    const commentId = await this.commentsService.createComment(
        userId,
        content,
        commentableType,
        commentableId,
      );
    
    return {
      code: 201,
      message: 'Comment created successfully',
      data: {
        id: commentId
      },
    };
  }

  @Delete('/:commentId')
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<DeleteCommentRespondDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new UserIdNotFoundError(userId)
    }
    await this.commentsService.deleteComment(userId, commentId);
    return {
      code: 204,
      message: 'Comment deleted already',
      success: true,
    };
  }

  @Put('/:commentId/agree:')
  async agreeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() requestBody: AgreeCommentDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AgreeCommentResponseDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new UserIdNotFoundError(userId)
    }
    const agree_type = requestBody;

    await this.commentsService.agreeComment(commentId, agree_type);

    return {
      code: 200,
      message: 'You have expressed your attitude towards the comment',
      data: { agree_type: agree_type.agree_type },
    };
  }

  @Get('/:commentId')
  async getCommentDetail(
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<CreateCommentResponseDto> {
    const comment = (await this.commentsService.getCommentDetail(commentId))
    return {
      code: 200,
      message: 'Details are as follows',
      data: comment,
    };
  }
}

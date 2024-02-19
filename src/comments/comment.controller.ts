import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
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
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  AgreeCommentDto,
  AgreeCommentResponseDto,
} from './DTO/agreeComment.dto';
import { CommentResponseDto } from './DTO/comment.dto';
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

  @Get('/commentType/commentId')
  async getComments(
    @Param('comment_Id', ParseIntPipe) commentId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
  ): Promise<GetCommentsResponseDto> {
    const commentData = (
      await this.commentsService.getComments(commentId, pageStart, pageSize)
    ).data.comments;
    const page = (
      await this.commentsService.getComments(commentId, pageStart, pageSize)
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

  @Post('/')
  async createComment(
    @Param('CommentableType')
    CommentableType: 'answer' | 'comment' | 'question',
    @Param('CommentableId', ParseIntPipe) CommentableId: number,
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CommentResponseDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    const data = (
      await this.commentsService.createComment(
        userId,
        content,
        CommentableType,
        CommentableId,
      )
    ).data;
    return {
      code: 200,
      message: 'Comment created successfully',
      data: data,
    };
  }

  @Delete('/comment_Id')
  async deleteComment(
    @Param('comment_Id', ParseIntPipe) comment_Id: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<DeleteCommentRespondDto> {
    const userId = this.authService.verify(auth).userId;

    if (!userId) {
      throw new NotFoundException('Unauthorized');
    }
    await this.commentsService.deleteComment(userId, comment_Id);
    return {
      code: 204,
      message: 'comment deleted already',
      success: true,
    };
  }

  @Put('/:comment_Id/agree:')
  async agreeComment(
    @Param('comment_Id', ParseIntPipe) comment_Id: number,
    @Body() requestBody: AgreeCommentDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AgreeCommentResponseDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    const agree_type = requestBody;

    await this.commentsService.agreeComment(comment_Id, agree_type);

    return {
      code: 200,
      message: 'Nice work',
      data: { agree_type: agree_type.agree_type },
    };
  }

  @Get('/comment_Id')
  async getCommentDetail(
    @Param('comment_Id', ParseIntPipe) comment_Id: number,
  ): Promise<CommentResponseDto> {
    const comment = (await this.commentsService.getCommentDetail(comment_Id))
      .data;

    return {
      code: 200,
      message: 'Details are as follows',
      data: comment,
    };
  }
}

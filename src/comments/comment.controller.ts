import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthenticationRequiredError } from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { UserIdNotFoundError } from '../users/users.error';
import { AttitudeCommentResponseDto } from './DTO/agreeComment.dto';
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
    @Param('commentableType')
    commentableType: 'answer' | 'question' | 'comment',
    @Param('commentableId', ParseIntPipe) commentableId: number,
    // @Query('page_start', new ParseIntPipe({ optional: true }))
    // pageStart: number = 1,
    // @Query('page_size', new ParseIntPipe({ optional: true }))
    // pageSize: number = 20,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<GetCommentsResponseDto> {
    const userId = this.authService.verify(auth).userId;
    if (!userId) {
      throw new UserIdNotFoundError(userId);
    }
    const [comments] = await this.commentsService.getComments(
      userId,
      commentableType,
      commentableId,
      // pageStart,
      // pageSize,
    );
    return {
      code: 200,
      message: 'Get comments successfully',
      data: {
        comments,
        //page,
      },
    };
  }

  // 咋成body了 应该是/:commentableType/:commentableId啊
  // 然后@Params('commentableType')
  @Post('/:commentableType/:commentableId/create')
  async createComment(
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Param('commentableType')
    commentableType: 'comment' | 'answer' | 'question',
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CreateCommentResponseDto> {
    if (!auth) {
      throw new AuthenticationRequiredError();
    }
    const userId = this.authService.verify(auth).userId;
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
        id: commentId,
      },
    };
  }

  @Delete('/:commentId')
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<DeleteCommentRespondDto> {
    if (!auth) {
      throw new AuthenticationRequiredError();
    }
    const userId = this.authService.verify(auth).userId;
    await this.commentsService.deleteComment(userId, commentId);
    return {
      code: 204,
      message: 'Comment deleted already',
      success: true,
    };
  }

  @Post('/:commentId/attitude')
  async altitudeToComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body('attitudeType') attitude: '1' | '2',
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AttitudeCommentResponseDto> {
    if (!auth) {
      throw new AuthenticationRequiredError();
    }
    const userId = this.authService.verify(auth).userId;

    await this.commentsService.altitudeToComment(userId, commentId, attitude);

    return {
      code: 201,
      message: 'You have expressed your attitude towards the comment',
      data: { attitudeType: attitude },
    };
  }

  @Get('/:commentId')
  async getCommentDetail(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CreateCommentResponseDto> {
    if (!auth) {
      throw new AuthenticationRequiredError();
    }
    const userId = this.authService.verify(auth).userId;
    const comment = await this.commentsService.getCommentDetail(
      userId,
      commentId,
    );
    return {
      code: 200,
      message: 'Details are as follows',
      data: comment,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { AttitudeTypeDto } from '../attitude/DTO/attitude.dto';
import { UpdateAttitudeResponseDto } from '../attitude/DTO/update-attitude.dto';
import { AuthService } from '../auth/auth.service';
import { AuthorizedAction } from '../auth/definitions';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { PageDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { CreateCommentResponseDto } from './DTO/create-comment.dto';
import { GetCommentDetailResponseDto } from './DTO/get-comment-detail.dto';
import { GetCommentsResponseDto } from './DTO/get-comments.dto';
import { UpdateCommentDto } from './DTO/update-comment.dto';
import { CommentsService } from './comment.service';
import { parseCommentable } from './commentable.enum';
@Controller('/comments')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/:commentableType/:commentableId')
  async getComments(
    @Param('commentableType') commentableType: string,
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetCommentsResponseDto> {
    let userId: number | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const [comments, page] = await this.commentsService.getComments(
      parseCommentable(commentableType),
      commentableId,
      pageStart,
      pageSize,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Get comments successfully',
      data: {
        comments,
        page,
      },
    };
  }

  //! The static route `/:commentId/attitudes` should come
  //! before the dynamic route `/:commentableType/:commentableId`
  //! so that it is not overridden.
  @Post('/:commentId/attitudes')
  async updateAttitudeToComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UpdateAttitudeResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.commentsService.getCommentCreatedById(commentId),
      'comment/attitude',
      commentId,
    );
    const attitudes = await this.commentsService.setAttitudeToComment(
      commentId,
      userId,
      attitudeType,
    );
    return {
      code: 200,
      message: 'You have expressed your attitude towards the comment',
      data: {
        attitudes,
      },
    };
  }

  @Post('/:commentableType/:commentableId')
  async createComment(
    @Param('commentableType')
    commentableType: string,
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Body('content') content: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<CreateCommentResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'comment',
      undefined,
    );
    const commentId = await this.commentsService.createComment(
      parseCommentable(commentableType),
      commentableId,
      content,
      userId,
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
  ): Promise<void> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      await this.commentsService.getCommentCreatedById(commentId),
      'comment',
      commentId,
    );
    await this.commentsService.deleteComment(commentId, userId);
  }

  @Get('/:commentId')
  async getCommentDetail(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetCommentDetailResponseDto> {
    let userId: number | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
    const comment = await this.commentsService.getCommentDto(
      commentId,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Details are as follows',
      data: {
        comment,
      },
    };
  }

  @Patch('/:commentId')
  async updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() { content }: UpdateCommentDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseResponseDto> {
    this.authService.audit(
      auth,
      AuthorizedAction.modify,
      await this.commentsService.getCommentCreatedById(commentId),
      'comment',
      commentId,
    );
    await this.commentsService.updateComment(commentId, content);
    return {
      code: 200,
      message: 'Comment updated successfully',
    };
  }
}

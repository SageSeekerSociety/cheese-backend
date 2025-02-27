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
import {
  AuthToken,
  CurrentUserOwnResource,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';
import { UserId } from '../auth/user-id.decorator';
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
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly authService: AuthService,
  ) {}

  @ResourceOwnerIdGetter('comment')
  async getCommentOwner(commentId: number): Promise<number> {
    return await this.commentsService.getCommentCreatedById(commentId);
  }

  @Get('/:commentableType/:commentableId')
  @Guard('enumerate', 'comment')
  async getComments(
    @Param('commentableType') commentableType: string,
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Query()
    { page_start: pageStart, page_size: pageSize }: PageDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetCommentsResponseDto> {
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
  @Guard('attitude', 'comment')
  async updateAttitudeToComment(
    @Param('commentId', ParseIntPipe) @ResourceId() commentId: number,
    @Body() { attitude_type: attitudeType }: AttitudeTypeDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<UpdateAttitudeResponseDto> {
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
  @Guard('create', 'comment')
  @CurrentUserOwnResource()
  async createComment(
    @Param('commentableType')
    commentableType: string,
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Body('content') content: string,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<CreateCommentResponseDto> {
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
  @Guard('delete', 'comment')
  async deleteComment(
    @Param('commentId', ParseIntPipe) @ResourceId() commentId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<void> {
    await this.commentsService.deleteComment(commentId, userId);
  }

  @Get('/:commentId')
  @Guard('query', 'comment')
  async getCommentDetail(
    @Param('commentId', ParseIntPipe) @ResourceId() commentId: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetCommentDetailResponseDto> {
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
  @Guard('modify', 'comment')
  async updateComment(
    @Param('commentId', ParseIntPipe) @ResourceId() commentId: number,
    @Body() { content }: UpdateCommentDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<BaseResponseDto> {
    await this.commentsService.updateComment(commentId, content);
    return {
      code: 200,
      message: 'Comment updated successfully',
    };
  }
}

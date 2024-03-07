import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AttitudeType } from '@prisma/client';
import { parseAttitude } from '../attitude/attitude.enum';
import { InvalidAttitudeTypeError } from '../attitude/attitude.error';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { CreateCommentResponseDto } from './DTO/create-comment.dto';
import { GetCommentDetailResponseDto } from './DTO/get-comment-detail.dto';
import { GetCommentsResponseDto } from './DTO/get-comments.dto';
import { CommentsService } from './comment.service';
import { parseCommentable } from './commentable.enum';
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
    commentableType: string,
    @Param('commentableId', ParseIntPipe) commentableId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number | undefined,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
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
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.delete,
      await this.commentsService.getCommentCreatedById(commentId),
      'comment',
      commentId,
    );
    await this.commentsService.deleteComment(commentId, userId);
    return {
      code: 204,
      message: 'Comment deleted already',
    };
  }

  private parseAttitudeTypeForComment(attitude: string): AttitudeType {
    const attitudeParsed = parseAttitude(attitude);
    const allowed: AttitudeType[] = [
      AttitudeType.UNDEFINED,
      AttitudeType.AGREE,
      AttitudeType.DISAGREE,
    ];
    if (allowed.indexOf(attitudeParsed) == -1)
      throw new InvalidAttitudeTypeError(attitude);
    return attitudeParsed;
  }

  @Put('/:commentId/attitude')
  async attitudeToComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body('attitude_type') attitude: string,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseRespondDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.other,
      await this.commentsService.getCommentCreatedById(commentId),
      'comment/attitude',
      commentId,
    );
    await this.commentsService.setAttitudeToComment(
      commentId,
      userId,
      this.parseAttitudeTypeForComment(attitude),
    );
    return {
      code: 200,
      message: 'You have expressed your attitude towards the comment',
    };
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
}

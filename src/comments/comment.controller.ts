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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { Question } from '../questions/questions.entity';
import { AgreeCommentResponseDto } from './DTO/agree-comment.dto';
import { CommentsService } from './comment.service';
@Controller('/comments')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly authService: AuthService,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  @Get('/:id')
  async getAnswerComments(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
  ) {
    const question = await this.questionsRepository.findOneBy({ id: id });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const { sub_comment_count, sub_comments } =
      await this.commentsService.getAnswerComments(
        answerId,
        pageStart,
        pageSize,
      );
    return {
      code: 200,
      sub_comment_count,
      sub_comments,
      page: {
        page_start: pageStart,
        page_size: pageSize,
      },
    };
  }

  @Post('/:id')
  async commentAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Headers('Authorization') auth: string | undefined,
    @Body() requestBody: { content: string; quote_id: number | null },
  ) {
    this.commentsService.commentAnswer(answerId, requestBody.content);
    return {
      code: 200,
    };
  }

  @Delete('/:id')
  async deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('comment_id', ParseIntPipe) commentId: number,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<void> {
    try {
      // 根据用户验证授权信息获取用户 ID
      const userId = this.authService.verify(auth).userId;

      if (!userId) {
        throw new NotFoundException('Unauthorized');
      }
      // 调用删除评论的服务方法
      await this.commentsService.deleteComment(commentId);

      // 返回空内容表示删除成功
      return; //默认返回204
    } catch (error) {
      // 处理错误并抛出异常
      throw new Error('Error while deleting comment');
    }
  }

  @Put('/id:')
  async agreeComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('comment_id', ParseIntPipe) commentId: number,
    @Body() requestBody: { agree_type: number },
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AgreeCommentResponseDto> {
    try {
      // 根据用户验证授权信息获取用户 ID
      const userId = this.authService.verify(auth).userId;

      // 从请求体中获取赞同类型
      const { agree_type } = requestBody;

      // 调用赞同评论的服务方法
      await this.commentsService.agreeComment(
        userId,
        answerId,
        commentId,
        agree_type,
      );

      // 返回空内容表示操作成功
      return {
        code: 200,
        message: '操作成功',
        agree_type: agree_type,
      };
    } catch (error) {
      // 处理错误并抛出异常
      throw new Error('Error while agreeing to comment');
    }
  }

  @Get('/')
  async getCommentDetail(
    @Param('id', ParseIntPipe) questionId: number,
    @Param('answer_id', ParseIntPipe) answerId: number,
    @Param('comment_id', ParseIntPipe) commentId: number,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart?: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number = 20,
  ) {
    const { comment, subComments, page } =
      await this.commentsService.getCommentDetail(
        answerId,
        commentId,
        pageStart,
        pageSize,
      );

    // 返回包含评论详情、子评论和分页信息的对象
    return {
      code: 200,
      comment,
      subComments,
      page,
    };
  }
}

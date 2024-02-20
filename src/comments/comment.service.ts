import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '../answer/answer.entity';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { Question } from '../questions/questions.entity';
import { AgreeCommentDto } from './DTO/agreeComment.dto';
import { GetCommentDetailDto } from './DTO/getCommentDetail.dto';
import { GetCommentsResponseDto } from './DTO/getComments.dto';
import { Comment, } from './comment.entity';
import { CommentNotFoundByUserError, CommentNotFoundError, CommentableIdNotFoundError, InvalidAgreeTypeError } from './comment.error';
@Injectable()
export class CommentsService {
  constructor(

    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Answer)
    private answersRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  async createComment(
    userId: number,
    content: string,
    commentableType: 'answer' | 'comment' | 'question',
    commentableId: number,
  ): Promise<number> {
    let commentableRepository;
    switch (commentableType) {
      case 'answer':
        commentableRepository = this.answersRepository;
        break;
      case 'comment':
        commentableRepository = this.commentsRepository;
        break;
      case 'question':
        commentableRepository = this.questionsRepository;
        break;
    }
    const commentable = await commentableRepository.findOneBy({id : commentableId});
    if (!commentable) {
      throw new CommentableIdNotFoundError(commentableId);
    }

    const comment = this.commentsRepository.create({
      userId,
      content,
      commentableType,
      commentableId,
    });
    const savedComment = await this.commentsRepository.save(comment); // 保存评论到数据库

    return savedComment.id;
  }

  async deleteComment(userId: number, commentId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId },
    });

    if (!comment) {
      throw new CommentNotFoundByUserError(userId);
    }

    await this.commentsRepository.softRemove(comment);
  }

  async getComments(
    commentId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ): Promise<GetCommentsResponseDto> {
    const comment = await this.commentsRepository.findOneBy({ id: commentId });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }

    const hasPrev = pageStart > 0;
    const hasMore = false;

    let prevStart: number | undefined;
    if (hasPrev) {
      prevStart = Math.max(0, pageStart - pageSize);
    }

    const page: PageRespondDto = {
      page_start: pageStart,
      page_size: pageSize,
      has_prev: hasPrev,
      prev_start: prevStart,
      has_more: hasMore,
      next_start: undefined,
    };

    const commentsData = [{
      comment: {
        id: comment.id,
        commentableId: comment.commentableId,
        commentableType: comment.commentableType,
        content: comment.content,
        user: comment.user,
        created_at: comment.createdAt.getTime(),
        agree_type: comment.agreeType,
        agree_count: comment.agreeCount,
        disagree_count: comment.disagreeCount,
      },
      sub_comment_count: 0,
      sub_comments: [],
    }];

    return {
      code: 200,
      message: 'get comment',
      data: {
        comments: commentsData,
        page,
      },
    };
  }

  async agreeComment(commentId: number, agreeType: AgreeCommentDto) {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    switch (agreeType.agree_type) {
      case 0:
        break;
      case 1:
        comment.agreeCount = comment.agreeCount + 1;
        break;
      case 2:
        comment.disagreeCount = comment.disagreeCount + 1;
        break;
      default:
        throw new InvalidAgreeTypeError(agreeType.agree_type);
    }
    return;
  }

  async getCommentDetail(commentId: number): Promise<GetCommentDetailDto> {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    const commentDto:GetCommentDetailDto = {
      code: 200,
      message: 'Get comment details successfully',
      id: comment.id,
      content: comment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      user: comment.user,
      disagree_count: comment.disagreeCount,
      agree_count: comment.agreeCount,
      agree_type: 0,
      created_at: comment.createdAt.getDate(),
    };
    return commentDto;
  }
}

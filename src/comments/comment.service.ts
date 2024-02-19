import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '../answer/answer.entity';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { Question } from '../questions/questions.entity';
import { UsersService } from '../users/users.service';
import { AgreeCommentDto } from './DTO/agreeComment.dto';
import { CommentResponseDto } from './DTO/comment.dto';
import { GetCommentsResponseDto } from './DTO/getComments.dto';
import {
  Comment,
  CommentMemberShip,
  CommentRelationship,
} from './comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(CommentMemberShip)
    private commentMembershipsRepository: Repository<CommentMemberShip>,
    @InjectRepository(CommentRelationship)
    private commentRelationshipRepository: Repository<CommentRelationship>,
    @InjectRepository(Answer)
    private answersRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  async createComment(
    userId: number,
    content: string,
    CommentableType: 'answer' | 'comment' | 'question',
    CommentableId: number,
    quoteId?: number | undefined,
    quoteUserId?: number | undefined,
  ): Promise<CommentResponseDto> {
    const comment = this.commentsRepository.create({
      content,
    });
    await this.commentsRepository.save(comment);
    const users = await this.usersService.getUserDtoById(userId);
    if (users) {
      const CommentMemberShip = this.commentMembershipsRepository.create({
        comment: comment,
        member: users,
      });
      await this.commentMembershipsRepository.save(CommentMemberShip);
    } else {
      throw new NotFoundException('User not found');
    }

    if (CommentableType == 'answer') {
      const answer = await this.answersRepository.findOne({
        where: { id: CommentableId },
      });
      if (!answer) {
        throw new NotFoundException('Answer not found');
      }
      const CommentAnswerShip = this.commentRelationshipRepository.create({
        answer: answer,
        comment: comment,
      });
      await this.commentRelationshipRepository.save(CommentAnswerShip);
    } else if (CommentableType == 'question') {
      const question = await this.questionsRepository.findOne({
        where: { id: CommentableId },
      });
      if (!question) {
        throw new NotFoundException('Question not found');
      }
      const CommentQuestionShip = this.commentRelationshipRepository.create({
        question: question,
        comment: comment,
      });
      await this.commentRelationshipRepository.save(CommentQuestionShip);
    } else if (CommentableType == 'comment') {
      const comment = await this.commentsRepository.findOneBy({
        id: CommentableId,
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
      const subComment = [comment];
      const CommentCommentShip = this.commentsRepository.create({
        subComments: subComment,
      });
      await this.commentsRepository.save(CommentCommentShip);
    }

    if (quoteUserId) {
      const quoteUser = await this.usersService.getUserDtoById(quoteUserId);
      if (!quoteUser) {
        throw new NotFoundException(quoteUserId);
      }
      return {
        code: 200,
        message: 'Comment created successfully',
        data: {
          id: comment.id,
          commentableId: CommentableId,
          commentableType: CommentableType,
          content: content,
          user: users,
          created_at: comment.createdAt.getTime(),
          agree_type: 0,
          agree_count: 0,
          disagree_count: 0,
          quote: {
            quote_id: quoteId,
            quote_user: quoteUser,
          },
        },
      };
    } else {
      return {
        code: 200,
        message: 'comment successfully',
        data: {
          id: comment.id,
          commentableId: CommentableId,
          commentableType: CommentableType,
          content: content,
          user: users,
          created_at: comment.createdAt.getTime(),
          agree_type: 0,
          agree_count: 0,
          disagree_count: 0,
          quote: {
            quote_id: undefined,
            quote_user: undefined,
          },
        },
      };
    }
  }

  async deleteComment(UserId: number, commentId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId: UserId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    await this.commentsRepository.softRemove(comment);
    await this.commentRelationshipRepository.softRemove(comment);
    await this.commentMembershipsRepository.softRemove(comment);
  }

  async getComments(
    commentId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ): Promise<GetCommentsResponseDto> {
    const comment = await this.commentsRepository.findOneBy({ id: commentId });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const subComments = await this.commentsRepository.find({
      where: {
        parentComment: { id: commentId },
      },
      order: {
        id: 'ASC',
      },
      skip: pageStart,
      take: pageSize,
    });

    const hasPrev = pageStart > 0;
    const hasMore = subComments.length === pageSize;

    let prevStart: number | undefined;
    if (hasPrev) {
      prevStart = Math.max(0, pageStart - pageSize);
    }

    let nextStart: number | undefined;
    if (hasMore) {
      nextStart = pageStart + pageSize;
    }

    const page: PageRespondDto = {
      page_start: pageStart,
      page_size: pageSize,
      has_prev: hasPrev,
      prev_start: prevStart,
      has_more: hasMore,
      next_start: nextStart,
    };

    const commentsData = subComments.map((subComment) => ({
      comment: {
        id: subComment.id,
        commentableId: subComment.commentableId,
        commentableType: subComment.commentableType,
        quote: {
          quote_id: subComment.quote_id,
          quote_user: subComment.quote_user,
        },
        content: subComment.content,
        user: subComment.user,
        created_at: subComment.createdAt.getTime(),
        agree_type: subComment.agreeType,
        agree_count: subComment.agreecount,
        disagree_count: subComment.disagreecount,
      },
      sub_comment_count: subComments.length,
      sub_comments: subComments.map((subComment) => ({
        id: subComment.id,
        commentableId: subComment.commentableId,
        commentableType: subComment.commentableType,
        quote: {
          quote_id: subComment.quote_id,
          quote_user: subComment.quote_user,
        },
        content: subComment.content,
        user: subComment.user,
        created_at: subComment.createdAt.getTime(),
        agree_type: subComment.agreeType,
        agree_count: subComment.agreecount,
        disagree_count: subComment.disagreecount,
      })),
    }));

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
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }
    switch (agreeType.agree_type) {
      case 0:
        break;
      case 1:
        comment.agreecount = comment.agreecount + 1;
        break;
      case 2:
        comment.disagreecount = comment.disagreecount + 1;
        break;
      default:
        throw new Error('Invalid agreeType value');
    }
    return;
  }

  async getCommentDetail(commentId: number): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }
    const commentDto: CommentResponseDto = {
      code: 200,
      message: 'Get comment details successfully',
      data: {
        id: comment.id,
        content: comment.content,
        commentableId: comment.commentableId,
        commentableType: comment.commentableType,
        quote: {
          quote_id: comment.quote_id,
          quote_user: comment.quote_user,
        },
        user: comment.user,
        disagree_count: comment.disagreecount,
        agree_count: comment.agreecount,
        agree_type: 0,
        created_at: comment.createdAt.getDate(),
      },
    };
    return commentDto;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '../answer/answer.entity';
import { Question } from '../questions/questions.entity';
import { User } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { CommentDto } from './DTO/comment.dto';
import {
  Comment,
  CommentAnswerShip,
  CommentMemberShip,
  CommentQuestionShip,
} from './comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(CommentMemberShip)
    private commentMembershipsRepository: Repository<CommentMemberShip>,
    @InjectRepository(CommentAnswerShip)
    private commentAnswerShipsRepository: Repository<CommentAnswerShip>,
    @InjectRepository(CommentQuestionShip)
    private commentQuestionShipsRepository: Repository<CommentQuestionShip>,
    @InjectRepository(Answer)
    private answersRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createComment(
    userId: number,
    content: string,
    quoteId = null,
    quoteUserId = null,
    targetType: string,
    targetId: number,
  ): Promise<CommentDto> {
    const comment = this.commentsRepository.create({
      content,
    });
    await this.commentsRepository.save(comment);
    const users = await this.usersRepository.findOneBy({ id: userId });
    if (users) {
      const CommentMemberShip = this.commentMembershipsRepository.create({
        comment: comment,
        member: users,
      });
      await this.commentMembershipsRepository.save(CommentMemberShip);
    } else {
      throw new NotFoundException('User not found');
    }
    if (targetType === 'answer') {
      const answer = await this.answersRepository.findOneBy({ id: targetId });
      if (!answer) {
        throw new NotFoundException('Answer not found');
      }
      const CommentAnswerShip = this.commentAnswerShipsRepository.create({
        answer: answer,
        comments: [comment],
      });
      await this.commentAnswerShipsRepository.save(CommentAnswerShip);
    } else if (targetType === 'question') {
      const question = await this.questionsRepository.findOneBy({
        id: targetId,
      });
      if (!question) {
        throw new NotFoundException('Question not found');
      }
      const CommentQuestionShip = this.commentQuestionShipsRepository.create({
        question: question,
        comments: [comment],
      });
      await this.commentQuestionShipsRepository.save(CommentQuestionShip);
    } else if (targetType === 'comment') {
      const comment = await this.commentsRepository.findOneBy({ id: targetId });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
      const subComment = [comment];
      const CommentCommentShip = this.commentsRepository.create({
        subComments: subComment,
      });
      await this.commentsRepository.save(CommentCommentShip);
    }

    const user = await this.usersService.getUserDtoById(userId);
    if (!user) {
      throw new NotFoundException(userId);
    }
    if (quoteUserId) {
      const quoteUser = await this.usersService.getUserDtoById(quoteUserId);
      if (!quoteUser) {
        throw new NotFoundException(quoteUserId);
      }
      return {
        id: comment.id,
        commentableId: targetId,
        commentableType: targetType,
        content: content,
        user: user,
        created_at: comment.createdAt.getTime(),
        agree_type: 0,
        agree_count: 0,
        disagree_count: 0,
        quote: {
          quote_id: quoteId,
          quote_user: quoteUser,
        },
      };
    } else {
      return {
        id: comment.id,
        commentableId: targetId,
        commentableType: targetType,
        content: content,
        user: user,
        created_at: comment.createdAt.getTime(),
        agree_type: 0,
        agree_count: 0,
        disagree_count: 0,
        quote: {
          quote_id: null,
          quote_user: null,
        },
      };
    }
  }

  async getCommentsById(commentId: number): Promise<CommentDto> {
    const comment = await this.commentsRepository.findOneBy({ id: commentId });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    const commentDto: CommentDto = {
      id: comment.id,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      content: comment.content,
      user: comment.user,
      created_at: comment.createdAt.getTime(),
      agree_type: 0,
      agree_count: 0,
      disagree_count: 0,
      quote: {
        quote_id: null,
        quote_user: null,
      },
    };

    return commentDto;
  }

  async deleteComment(commentId: number): Promise<void> {
    const comment = await this.commentsRepository.findOneBy({ id: commentId });

    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    await this.commentsRepository.remove(comment);
  }

  async commentAnswer(answerId: number, content: string): Promise<CommentDto> {
    const answer = await this.answersRepository.findOneBy({ id: answerId });

    if (!answer) {
      throw new Error('Answer not found');
    }

    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'answer';
    comment.commentableId = answer.id;

    const createdComment = await this.commentsRepository.save(comment);

    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getTime(),
    };

    return commentDto;
  }

  async commentQuestion(
    questionId: number,
    content: string,
  ): Promise<CommentDto> {
    const question = await this.questionsRepository.findOneBy({
      id: questionId,
    });

    if (!question) {
      throw new Error('Answer not found');
    }

    // 创建评论
    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'question';
    comment.commentableId = question.id;
    const createdComment = await this.commentsRepository.save(comment);
    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getDate(),
    };
    return commentDto;
  }

  async commentComment(
    commentId: number,
    content: string,
  ): Promise<CommentDto> {
    const Comments = await this.questionsRepository.findOneBy({
      id: commentId,
    });

    if (!Comments) {
      throw new Error('Answer not found');
    }

    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'question';
    comment.commentableId = Comments.id;

    const createdComment = await this.commentsRepository.save(comment);

    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getDate(),
    };

    return commentDto;
  }

  async getCommentDetail(
    answerId: number,
    commentId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ) {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
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
    return {
      comment,
      subComments,
      page: {
        pageStart,
        pageSize,
      },
    };
  }
  async agreeComment(
    id: number,
    answerId: number,
    commentId: number,
    agreeType: number,
  ) {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }
    switch (agreeType) {
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

  async getAnswerComments(
    answerId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ) {
    try {
      const comments = await this.commentsRepository.find({
        where: { commentableId: answerId, commentableType: 'answer' },
        skip: pageStart,
        take: pageSize,
      });

      const totalComments = await this.commentsRepository.count({
        where: { commentableId: answerId, commentableType: 'answer' },
      });

      return {
        sub_comment_count: totalComments,
        sub_comments: comments,
      };
    } catch (error) {
      throw new Error('Error while fetching answer comments');
    }
  }
}

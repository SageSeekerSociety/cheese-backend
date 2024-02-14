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
    userId: number, //用户ID
    content: string, //评论内容
    quoteId = null, //引用的Id
    quoteUserId = null, //引用的用户的id
    targetType: string, //评论目标的类型
    targetId: number, //评论目标的Id
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
    } //没找到这么个用户
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
      // 其他字段根据需要添加
    };

    return commentDto;
  }

  async deleteComment(commentId: number): Promise<void> {
    // 从数据库中查找要删除的评论
    const comment = await this.commentsRepository.findOneBy({ id: commentId });

    // 如果找不到评论，则抛出 NotFoundException
    if (!comment) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    // 执行删除操作
    await this.commentsRepository.remove(comment);
  }

  async commentAnswer(answerId: number, content: string): Promise<CommentDto> {
    // 查找要评论的答案
    // 假设您有一个名为 Answer 的实体用于表示答案
    const answer = await this.answersRepository.findOneBy({ id: answerId });

    if (!answer) {
      throw new Error('Answer not found');
    }

    // 创建评论
    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'answer'; // 关联评论和答案
    comment.commentableId = answer.id;
    // 保存评论到数据库
    const createdComment = await this.commentsRepository.save(comment);

    // 将创建的评论转换为 DTO
    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId, // 答案的 ID
      commentableType: comment.commentableType, // 答案的类型
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getTime(),
      // 其他字段赋值
    };

    // 返回创建的评论 DTO
    return commentDto;
  }

  async commentQuestion(
    questionId: number,
    content: string,
  ): Promise<CommentDto> {
    // 查找要评论的答案
    // 假设您有一个名为 Answer 的实体用于表示答案
    const question = await this.questionsRepository.findOneBy({
      id: questionId,
    });

    if (!question) {
      throw new Error('Answer not found');
    }

    // 创建评论
    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'question'; // 关联评论和答案
    comment.commentableId = question.id;
    // 保存评论到数据库
    const createdComment = await this.commentsRepository.save(comment);

    // 将创建的评论转换为 DTO
    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId, // 答案的 ID
      commentableType: comment.commentableType, // 答案的类型
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getDate(),
      // 其他字段赋值
    };
    // 返回创建的评论 DTO
    return commentDto;
  }

  async commentComment(
    commentId: number,
    content: string,
  ): Promise<CommentDto> {
    // 查找要评论的答案
    // 假设您有一个名为 Answer 的实体用于表示答案
    const Comments = await this.questionsRepository.findOneBy({
      id: commentId,
    });

    if (!Comments) {
      throw new Error('Answer not found');
    }

    // 创建评论
    const comment = new Comment();
    comment.content = content;
    comment.commentableType = 'question'; // 关联评论和答案
    comment.commentableId = Comments.id;
    // 保存评论到数据库
    const createdComment = await this.commentsRepository.save(comment);

    // 将创建的评论转换为 DTO
    const commentDto: CommentDto = {
      id: createdComment.id,
      content: createdComment.content,
      commentableId: comment.commentableId, // 答案的 ID
      commentableType: comment.commentableType, // 答案的类型
      user: comment.user,
      quote: {
        quote_id: null,
        quote_user: null,
      },
      agree_count: 0,
      disagree_count: 0,
      agree_type: 0,
      created_at: comment.createdAt.getDate(),
      // 其他字段赋值
    };
    // 返回创建的评论 DTO
    return commentDto;
  }

  async getCommentDetail(
    answerId: number,
    commentId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ) {
    try {
      // 查找评论
      const comment = await this.commentsRepository.findOneBy({
        id: commentId,
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // 查找子评论
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

      // 返回评论详情
      return {
        comment,
        subComments,
        page: {
          pageStart,
          pageSize,
        },
      };
    } catch (error) {
      throw new Error('Error while fetching comment detail');
    }
  }
  async agreeComment(
    id: number,
    answerId: number,
    commentId: number,
    agreeType: number,
  ) {
    try {
      // 根据 agreeType 的值执行不同的操作
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
          // 赞同，可以执行增加赞同数等操作
          comment.agreecount = comment.agreecount + 1;
          break;
        case 2:
          // 反对，可以执行增加反对数等操作
          comment.disagreecount = comment.disagreecount + 1;
          break;
        default:
          // 其他情况，可能需要处理错误或者返回错误信息
          throw new Error('Invalid agreeType value');
      }

      // 操作成功后返回空内容
      return;
    } catch (error) {
      throw new Error('Error while agreeing comment');
    }
  }

  async getAnswerComments(
    answerId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ) {
    try {
      // 假设这里是从数据库中获取评论的逻辑，这里只是一个示例
      const comments = await this.commentsRepository.find({
        where: { commentableId: answerId, commentableType: 'answer' },
        skip: pageStart,
        take: pageSize,
      });

      // 假设这里是获取评论总数的逻辑，这里只是一个示例
      const totalComments = await this.commentsRepository.count({
        where: { commentableId: answerId, commentableType: 'answer' },
      });

      // 返回获取的评论以及评论总数
      return {
        sub_comment_count: totalComments,
        sub_comments: comments,
      };
    } catch (error) {
      throw new Error('Error while fetching answer comments');
    }
  }
}

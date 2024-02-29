import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '../answer/answer.legacy.entity';
import { Question } from '../questions/questions.legacy.entity';
import { User } from '../users/users.legacy.entity';
import { UsersService } from '../users/users.service';
import { CommentDto } from './DTO/comment.dto';
import { GetCommentDetailDto } from './DTO/getCommentDetail.dto';
import { Comment, UserAttitudeOnComments } from './comment.entity';
import {
  CommentNotFoundByUserError,
  CommentNotFoundError,
  CommentableIdNotFoundError,
  InvalidAgreeTypeError,
} from './comment.error';
@Injectable()
export class CommentsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAttitudeOnComments)
    private userAttitudeOnCommentsRepository: Repository<UserAttitudeOnComments>,
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
    let commentable;
    switch (commentableType) {
      case 'answer':
        commentable = await this.answersRepository.findOneBy({
          id: commentableId,
        });
        break;
      case 'comment':
        commentable = await this.commentsRepository.findOneBy({
          id: commentableId,
        });
        break;
      case 'question':
        commentable = await this.questionsRepository.findOneBy({
          id: commentableId,
        });
        break;
    }

    if (!commentable) {
      throw new CommentableIdNotFoundError(commentableId);
    }

    const comment = this.commentsRepository.create({
      userId,
      content,
      commentableType,
      commentableId,
    });
    const userAttitudeOnComment = this.userAttitudeOnCommentsRepository.create({
      agreeType: 'Indifferent',
      userId: userId,
      comment: comment,
    });
    comment.agreeCount = 0;
    comment.disagreeCount = 0;
    const savedComment = await this.commentsRepository.save(comment);
    await this.userAttitudeOnCommentsRepository.save(userAttitudeOnComment);
    return savedComment.id;
  }

  async deleteComment(userId: number, commentId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId },
    });

    if (!comment) {
      const Comment = await this.commentsRepository.findOne({
        where: { id: commentId },
      });
      if (!Comment) throw new CommentNotFoundError(commentId);
      else throw new CommentNotFoundByUserError(userId);
    }
    await this.commentsRepository.softRemove(comment);
  }

  async getComments(
    userId: number,
    commentableType: 'answer' | 'question' | 'comment',
    commentableId: number,
    // pageStart: number,
    // pageSize: number = 20,
  ): Promise<
    [
      {
        comment: CommentDto;
      }[],
      // PageRespondDto,
    ]
  > {
    let commentableRepository;
    switch (commentableType) {
      case 'answer':
        commentableRepository = this.answersRepository;
        break;
      case 'question':
        commentableRepository = this.questionsRepository;
        break;
      case 'comment':
        commentableRepository = this.commentsRepository;
        break;
    }

    const comments = (await commentableRepository.find({
      where: { id: commentableId },
      // skip: pageStart,
      // take: pageSize,
    })) as Comment[];
    if (!comments) {
      throw new CommentNotFoundError(commentableId);
    }
    // const hasPrev = pageStart > 0;
    // const hasMore = comments.length === pageSize;

    // let prevStart: number | undefined;
    // if (hasPrev) {
    //   prevStart = Math.max(0, pageStart - pageSize);
    // }

    // const page: PageRespondDto = {
    //   page_start: pageStart,
    //   page_size: pageSize,
    //   has_prev: hasPrev,
    //   prev_start: prevStart,
    //   has_more: hasMore,
    //   next_start: hasMore ? pageStart + pageSize : undefined,
    // };

    const commentsData = comments.map(async (comment) => {
      const userAttitudeOnComments =
        await this.userAttitudeOnCommentsRepository.findOne({
          where: { id: comment.id, userId },
        });
      const userDto = await this.usersService.getUserDtoById(userId);
      return {
        comment: {
          id: comment.id,
          commentableId: comment.commentableId,
          commentableType: comment.commentableType,
          content: comment.content,
          user: userDto,
          createdAt: comment.createdAt.getTime(),
          agreeCount: comment.agreeCount,
          disagreeCount: comment.disagreeCount,
          agreeType: userAttitudeOnComments
            ? userAttitudeOnComments.agreeType
            : 'Indifferent',
        },
      };
    });

    const resolvedCommentsData = await Promise.all(commentsData);

    // return a tuple
    return [resolvedCommentsData];
  }

  async attitudeToComment(
    userId: number,
    commentId: number,
    attitudeType: 'Agreed' | 'Disagreed',
  ) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });
    const userAttitudeOnComment =
      await this.userAttitudeOnCommentsRepository.findOne({
        where: { id: commentId, userId },
      });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    switch (attitudeType) {
      case 'Agreed':
        if (userAttitudeOnComment?.agreeType != 'Agreed') {
          if (userAttitudeOnComment?.agreeType == 'Disagreed') {
            comment.disagreeCount = comment.disagreeCount - 1;
          }
          comment.agreeCount = comment.agreeCount + 1;
        }
        break;
      case 'Disagreed':
        if (userAttitudeOnComment?.agreeType != 'Disagreed') {
          if (userAttitudeOnComment?.agreeType == 'Agreed') {
            comment.agreeCount = comment.agreeCount - 1;
          }
          comment.disagreeCount = comment.disagreeCount + 1;
        }
        break;
      default:
        throw new InvalidAgreeTypeError(attitudeType);
    }
    if (userAttitudeOnComment) {
      userAttitudeOnComment.agreeType = attitudeType;
      await this.userAttitudeOnCommentsRepository.save(userAttitudeOnComment);
    }
    await this.commentsRepository.save(comment);
    return;
  }

  async getCommentDetail(
    userId: number,
    commentId: number,
  ): Promise<GetCommentDetailDto> {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    const user = await this.usersRepository.findOneBy({ id: userId });
    const userAttitudeOnComment =
      await this.userAttitudeOnCommentsRepository.findOne({
        where: { id: commentId, userId },
      });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    const commentDto = {
      id: comment.id,
      content: comment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      disagreeCount: comment.disagreeCount,
      agreeCount: comment.agreeCount,
      createdAt: comment.createdAt.getTime(),
      agreeType: user
        ? userAttitudeOnComment
          ? userAttitudeOnComment.agreeType
          : 'Indifferent'
        : 'Indifferent',
    };
    return commentDto;
  }
}

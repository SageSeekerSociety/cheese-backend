import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttitudableType, AttitudeType } from '@prisma/client';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AnswerService } from '../answer/answer.service';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { UsersService } from '../users/users.service';
import { CommentDto } from './DTO/comment.dto';
import {
  CommentNotFoundError,
  CommentableNotFoundError,
} from './comment.error';
import {
  Comment,
  CommentDeleteLog,
  CommentQueryLog,
} from './comment.legacy.entity';
import { CommentableType } from './commentable.enum';

@Injectable()
export class CommentsService {
  constructor(
    private readonly attitudeService: AttitudeService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    private readonly questionService: QuestionsService,
    private readonly prismaService: PrismaService,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentDeleteLog)
    private commentDeleteLogRepository: Repository<CommentDeleteLog>,
    @InjectRepository(CommentQueryLog)
    private commentQueryLogRepository: Repository<CommentQueryLog>,
  ) {}

  private async ensureCommentableExists(
    commentableType: CommentableType,
    commentableId: number,
  ): Promise<void> {
    switch (commentableType) {
      case CommentableType.ANSWER:
        if (
          (await this.answerService.isAnswerExistsAcrossQuestions(
            commentableId,
          )) == false
        )
          throw new CommentableNotFoundError(commentableType, commentableId);
        break;
      case CommentableType.COMMENT:
        if ((await this.isCommentExists(commentableId)) == false)
          throw new CommentableNotFoundError(commentableType, commentableId);
        break;
      case CommentableType.QUESTION:
        if (
          (await this.questionService.isQuestionExists(commentableId)) == false
        )
          throw new CommentableNotFoundError(commentableType, commentableId);
        break;
      default:
        throw new Error(
          `CommentService.ensureCommentableExists() does not support commentable type ${commentableType}`,
        );
    }
  }

  async isCommentExists(commentId: number): Promise<boolean> {
    return (await this.commentRepository.countBy({ id: commentId })) > 0;
  }

  async createComment(
    commentableType: CommentableType,
    commentableId: number,
    content: string,
    createdById: number,
  ): Promise<number> {
    await this.ensureCommentableExists(commentableType, commentableId);
    const comment = this.commentRepository.create({
      commentableType,
      commentableId,
      content,
      createdById,
    });
    await this.commentRepository.save(comment);
    return comment.id;
  }

  async deleteComment(commentId: number, operatedById: number): Promise<void> {
    const comment = await this.commentRepository.findOneBy({ id: commentId });
    if (comment == null) throw new CommentNotFoundError(commentId);
    await this.commentRepository.softRemove(comment);
    const log = this.commentDeleteLogRepository.create({
      commentId,
      operatedById,
    });
    await this.commentDeleteLogRepository.save(log);
  }

  async getCommentDto(
    commentId: number,
    viewerId?: number,
    ip?: string,
    userAgent?: string,
  ): Promise<CommentDto> {
    const comment = await this.commentRepository.findOneBy({
      id: commentId,
    });
    if (comment == null) {
      throw new CommentNotFoundError(commentId);
    }
    if (viewerId != undefined || ip != undefined || userAgent != undefined) {
      const log = this.commentQueryLogRepository.create({
        commentId,
        viewerId,
        ip,
        userAgent,
      });
      await this.commentQueryLogRepository.save(log);
    }
    return {
      id: comment.id,
      content: comment.content,
      commentable_id: comment.commentableId,
      commentable_type: comment.commentableType,
      user: await this.usersService.getUserDtoById(
        comment.createdById,
        viewerId,
        ip,
        userAgent,
      ),
      created_at: comment.createdAt.getTime(),
      attitudes: await this.attitudeService.getAttitudeStatusDto(
        AttitudableType.COMMENT,
        commentId,
        viewerId,
      ),
    };
  }

  async getComments(
    commentableType: CommentableType,
    commentableId: number,
    pageStart: number | undefined,
    pageSize: number = 20,
    viewerId?: number,
    ip?: string,
    userAgent?: string,
  ): Promise<[CommentDto[], PageRespondDto]> {
    if (pageStart == undefined) {
      const comments = await this.commentRepository.find({
        where: {
          commentableType,
          commentableId,
        },
        order: { createdAt: 'DESC' },
        take: pageSize + 1,
      });
      const commentDtos = await Promise.all(
        comments.map((comment) =>
          this.getCommentDto(comment.id, viewerId, ip, userAgent),
        ),
      );
      return PageHelper.PageStart(commentDtos, pageSize, (i) => i.id);
    } else {
      const start = await this.commentRepository.findOneBy({ id: pageStart });
      if (start == null) throw new CommentNotFoundError(pageStart);
      const prev = await this.commentRepository.find({
        where: {
          commentableType,
          commentableId,
          createdAt: MoreThan(start.createdAt),
        },
        order: { createdAt: 'ASC' },
        take: pageSize,
      });
      const curr = await this.commentRepository.find({
        where: {
          commentableType,
          commentableId,
          createdAt: LessThanOrEqual(start.createdAt),
        },
        order: { createdAt: 'DESC' },
        take: pageSize + 1,
      });
      const currDtos = await Promise.all(
        curr.map((comment) =>
          this.getCommentDto(comment.id, viewerId, ip, userAgent),
        ),
      );
      return PageHelper.PageMiddle(
        prev,
        currDtos,
        pageSize,
        (i) => i.id,
        (i) => i.id,
      );
    }
  }

  async setAttitudeToComment(
    commentId: number,
    userId: number,
    attitudeType: AttitudeType,
  ): Promise<AttitudeStateDto> {
    const commment = await this.commentRepository.findOneBy({ id: commentId });
    if (commment == null) throw new CommentNotFoundError(commentId);
    await this.attitudeService.setAttitude(
      userId,
      AttitudableType.COMMENT,
      commentId,
      attitudeType,
    );
    return await this.attitudeService.getAttitudeStatusDto(
      AttitudableType.COMMENT,
      commentId,
      userId,
    );
  }

  async getCommentCreatedById(commentId: number): Promise<number> {
    const comment = await this.commentRepository.findOneBy({
      id: commentId,
    });
    if (comment == undefined) throw new CommentNotFoundError(commentId);
    return comment.createdById;
  }

  async updateComment(commentId: number, content: string): Promise<void> {
    const comment = await this.commentRepository.findOneBy({ id: commentId });
    if (comment == undefined) throw new CommentNotFoundError(commentId);
    comment.content = content;
    await this.commentRepository.save(comment);
  }

  async countCommentsByCommentable(
    commentableType: CommentableType,
    commentableId: number,
  ): Promise<number> {
    return this.commentRepository.countBy({
      commentableType,
      commentableId,
    });
  }
}

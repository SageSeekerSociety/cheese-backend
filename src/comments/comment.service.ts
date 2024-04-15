import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  AttitudableType,
  AttitudeType,
  Comment,
  CommentCommentabletypeEnum,
} from '@prisma/client';
import { AnswerService } from '../answer/answer.service';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { UsersService } from '../users/users.service';
import { CommentDto } from './DTO/comment.dto';
import {
  CommentNotFoundError,
  CommentableNotFoundError,
} from './comment.error';

@Injectable()
export class CommentsService {
  constructor(
    private readonly attitudeService: AttitudeService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    private readonly questionService: QuestionsService,
    private readonly prismaService: PrismaService,
  ) {}

  private async ensureCommentableExists(
    commentableType: CommentCommentabletypeEnum,
    commentableId: number,
  ): Promise<void> {
    switch (commentableType) {
      case CommentCommentabletypeEnum.ANSWER:
        if (
          (await this.answerService.isAnswerExistsAcrossQuestions(
            commentableId,
          )) == false
        )
          throw new CommentableNotFoundError(commentableType, commentableId);
        break;
      case CommentCommentabletypeEnum.COMMENT:
        if ((await this.isCommentExists(commentableId)) == false)
          throw new CommentableNotFoundError(commentableType, commentableId);
        break;
      case CommentCommentabletypeEnum.QUESTION:
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

  async findCommentOrThrow(commentId: number): Promise<Comment> {
    const comment = await this.prismaService.comment.findUnique({
      where: {
        deletedAt: null,
        id: commentId,
      },
    });
    if (comment == null) throw new CommentNotFoundError(commentId);
    return comment;
  }

  async isCommentExists(commentId: number): Promise<boolean> {
    const count = await this.prismaService.comment.count({
      where: {
        deletedAt: null,
        id: commentId,
      },
    });
    return count > 0;
  }

  async createComment(
    commentableType: CommentCommentabletypeEnum,
    commentableId: number,
    content: string,
    createdById: number,
  ): Promise<number> {
    await this.ensureCommentableExists(commentableType, commentableId);
    const result = await this.prismaService.comment.create({
      data: {
        commentableType,
        commentableId,
        content,
        createdById,
      },
    });
    return result.id;
  }

  async deleteComment(commentId: number, operatedById: number): Promise<void> {
    if ((await this.isCommentExists(commentId)) == false)
      throw new CommentNotFoundError(commentId);
    await this.prismaService.comment.update({
      where: {
        id: commentId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    await this.prismaService.commentDeleteLog.create({
      data: {
        commentId,
        operatedById,
      },
    });
  }

  async getCommentDto(
    commentId: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<CommentDto> {
    const comment = await this.findCommentOrThrow(commentId);
    await this.prismaService.commentQueryLog.create({
      data: {
        commentId,
        viewerId,
        ip,
        userAgent,
      },
    });
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
    commentableType: CommentCommentabletypeEnum,
    commentableId: number,
    pageStart: number | undefined,
    pageSize: number = 20,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[CommentDto[], PageDto]> {
    if (pageStart == undefined) {
      const comments = await this.prismaService.comment.findMany({
        where: {
          deletedAt: null,
          commentableType,
          commentableId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: pageSize + 1,
      });
      const commentDtos = await Promise.all(
        comments.map((comment) =>
          this.getCommentDto(comment.id, viewerId, ip, userAgent),
        ),
      );
      return PageHelper.PageStart(commentDtos, pageSize, (i) => i.id);
    } else {
      const start = await this.findCommentOrThrow(pageStart);
      const prev = await this.prismaService.comment.findMany({
        where: {
          deletedAt: null,
          commentableType,
          commentableId,
          createdAt: {
            gt: start.createdAt,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: pageSize,
      });
      const curr = await this.prismaService.comment.findMany({
        where: {
          deletedAt: null,
          commentableType,
          commentableId,
          createdAt: {
            lte: start.createdAt,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
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
    if ((await this.isCommentExists(commentId)) == false)
      throw new CommentNotFoundError(commentId);
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
    const comment = await this.findCommentOrThrow(commentId);
    return comment.createdById;
  }

  async updateComment(commentId: number, content: string): Promise<void> {
    if ((await this.isCommentExists(commentId)) == false)
      throw new CommentNotFoundError(commentId);
    await this.prismaService.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content,
      },
    });
  }

  async countCommentsByCommentable(
    commentableType: CommentCommentabletypeEnum,
    commentableId: number,
  ): Promise<number> {
    return await this.prismaService.comment.count({
      where: {
        deletedAt: null,
        commentableType,
        commentableId,
      },
    });
  }
}

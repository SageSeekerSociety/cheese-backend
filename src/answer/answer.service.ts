//
//  In this file, in the parameters of all methods except those whose name is ended with 'AcrossQuestions'
//  an answer id should always be after a question id, which can be used as the sharding key in the future.
//

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  AttitudableType,
  AttitudeType,
  CommentCommentabletypeEnum,
} from '@prisma/client';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { CommentsService } from '../comments/comment.service';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { QuestionNotFoundError } from '../questions/questions.error';
import { QuestionsService } from '../questions/questions.service';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { AnswerDto } from './DTO/answer.dto';
import {
  AnswerAlreadyFavoriteError,
  AnswerNotFavoriteError,
  AnswerNotFoundError,
  QuestionAlreadyAnsweredError,
} from './answer.error';

@Injectable()
export class AnswerService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
    @Inject(forwardRef(() => CommentsService))
    private readonly commentsService: CommentsService,
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,
    private readonly attitudeService: AttitudeService,
    private readonly prismaService: PrismaService,
  ) {}

  async createAnswer(
    questionId: number,
    createdById: number,
    content: string,
  ): Promise<number> {
    const existingAnswerId = await this.getAnswerIdOfCreatedBy(
      questionId,
      createdById,
    );
    if (existingAnswerId != null) {
      throw new QuestionAlreadyAnsweredError(
        createdById,
        questionId,
        existingAnswerId,
      );
    }

    const answer = await this.prismaService.answer.create({
      data: {
        questionId,
        createdById,
        content,
        createdAt: new Date(),
      },
    });
    return answer.id;
  }

  async getQuestionAnswers(
    questionId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[AnswerDto[], PageDto]> {
    if (!pageStart) {
      const currPage = await this.prismaService.answer.findMany({
        where: {
          questionId,
        },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageStart(currDto, pageSize, (answer) => answer.id);
    } else {
      const start = await this.prismaService.answer.findUnique({
        where: {
          id: pageStart,
        },
      });
      if (!start) {
        throw new AnswerNotFoundError(pageStart);
      }
      const prevPage = await this.prismaService.answer.findMany({
        where: {
          questionId,
          id: { lt: pageStart },
        },
        orderBy: { id: 'desc' },
        take: pageSize,
      });
      const currPage = await this.prismaService.answer.findMany({
        where: {
          questionId,
          id: { gte: pageStart },
        },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageMiddle(
        prevPage,
        currDto,
        pageSize,
        (answer) => answer.id,
        (answer) => answer.id,
      );
    }
  }

  async getUserAnsweredAnswersAcrossQuestions(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[AnswerDto[], PageDto]> {
    if ((await this.usersService.isUserExists(userId)) == false)
      throw new UserIdNotFoundError(userId);
    if (!pageStart) {
      const currPage = await this.prismaService.answer.findMany({
        where: {
          createdById: userId,
        },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            entity.questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageStart(currDto, pageSize, (answer) => answer.id);
    } else {
      const prevPage = await this.prismaService.answer.findMany({
        where: {
          createdById: userId,
          id: { lt: pageStart },
        },
        orderBy: { id: 'desc' },
        take: pageSize,
      });
      const currPage = await this.prismaService.answer.findMany({
        where: {
          createdById: userId,
          id: { gte: pageStart },
        },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            entity.questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageMiddle(
        prevPage,
        currDto,
        pageSize,
        (answer) => answer.id,
        (answer) => answer.id,
      );
    }
  }

  // questionId is reserved for sharding
  getViewCountOfAnswer(questionId: number, answerId: number): Promise<number> {
    return this.prismaService.answerQueryLog.count({
      where: {
        answerId,
      },
    });
  }

  // questionId is reserved for sharding
  async isFavorite(
    questionId: number,
    answerId: number,
    userId: number | undefined,
  ): Promise<boolean> {
    if (userId == undefined) return false;
    const answer = await this.prismaService.answer.findUnique({
      where: {
        id: answerId,
        answerFavoritedByUser: {
          some: { userId },
        },
      },
    });
    return answer != null;
  }

  async getAnswerDto(
    questionId: number,
    answerId: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<AnswerDto> {
    const answer = await this.prismaService.answer.findUnique({
      where: {
        questionId,
        id: answerId,
      },
      include: {
        answerFavoritedByUser: true,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const authorDtoPromise = this.usersService.getUserDtoById(
      answer.createdById,
      viewerId,
      ip,
      userAgent,
    );
    const attitudeStatusDtoPromise = this.attitudeService.getAttitudeStatusDto(
      AttitudableType.ANSWER,
      answerId,
      viewerId,
    );
    const viewCountPromise = this.getViewCountOfAnswer(questionId, answerId);
    const commentCountPromise = this.commentsService.countCommentsByCommentable(
      CommentCommentabletypeEnum.ANSWER,
      answerId,
    );
    const isFavoritePromise = this.isFavorite(questionId, answerId, viewerId);
    const groupDtoPromise =
      answer.groupId == undefined
        ? Promise.resolve(undefined)
        : this.groupsService.getGroupDtoById(
            viewerId,
            answer.groupId,
            ip,
            userAgent,
          );

    const [
      authorDto,
      attitudeStatusDto,
      viewCount,
      commentCount,
      isFavorite,
      groupDto,
    ] = await Promise.all([
      authorDtoPromise,
      attitudeStatusDtoPromise,
      viewCountPromise,
      commentCountPromise,
      isFavoritePromise,
      groupDtoPromise,
    ]);

    if (viewerId != undefined && ip != undefined && userAgent != undefined) {
      await this.prismaService.answerQueryLog.create({
        data: {
          answerId,
          viewerId,
          ip,
          userAgent,
          createdAt: new Date(),
        },
      });
    }

    return {
      id: answer.id,
      question_id: answer.questionId,
      content: answer.content,
      author: authorDto,
      created_at: answer.createdAt.getTime(),
      updated_at: answer.updatedAt.getTime(),
      attitudes: attitudeStatusDto,
      favorite_count: answer.answerFavoritedByUser.length,
      view_count: viewCount,
      comment_count: commentCount,
      is_favorite: isFavorite,
      is_group: answer.groupId != undefined,
      group: groupDto,
    };
  }

  async updateAnswer(
    questionId: number,
    answerId: number,
    content: string,
    updaterId: number,
  ): Promise<void> {
    const answer = await this.prismaService.answer.findUnique({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const oldContent = answer.content;
    await this.prismaService.answer.update({
      where: {
        questionId,
        id: answerId,
      },
      data: {
        content,
      },
    });

    await this.prismaService.answerUpdateLog.create({
      data: {
        updaterId,
        answerId,
        oldContent,
        newContent: content,
        createdAt: new Date(),
      },
    });
  }

  async deleteAnswer(
    questionId: number,
    answerId: number,
    deleterId: number,
  ): Promise<void> {
    if ((await this.isAnswerExists(questionId, answerId)) == false) {
      throw new AnswerNotFoundError(answerId);
    }

    await this.prismaService.answer.update({
      where: {
        questionId,
        id: answerId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.prismaService.answerDeleteLog.create({
      data: {
        deleterId,
        answerId,
        createdAt: new Date(),
      },
    });
  }

  async getFavoriteAnswers(
    userId: number,
    pageStart: number, // undefined if from start
    pageSize: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[AnswerDto[], PageDto]> {
    if ((await this.usersService.isUserExists(userId)) == false)
      throw new UserIdNotFoundError(userId);
    if (!pageStart) {
      const currPage = await this.prismaService.answer.findMany({
        where: { answerFavoritedByUser: { some: { userId } } },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            entity.questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageStart(currDto, pageSize, (answer) => answer.id);
    } else {
      const prevPage = await this.prismaService.answer.findMany({
        where: {
          answerFavoritedByUser: { some: { userId } },
          id: { lt: pageStart },
        },
        orderBy: { id: 'desc' },
        take: pageSize,
      });
      const currPage = await this.prismaService.answer.findMany({
        where: {
          answerFavoritedByUser: { some: { userId } },
          id: { gte: pageStart },
        },
        orderBy: { id: 'asc' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(
            entity.questionId,
            entity.id,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageMiddle(
        prevPage,
        currDto,
        pageSize,
        (answer) => answer.id,
        (answer) => answer.id,
      );
    }
  }

  async favoriteAnswer(
    questionId: number,
    answerId: number,
    createdById: number,
  ): Promise<void> {
    if ((await this.isAnswerExists(questionId, answerId)) == false) {
      throw new AnswerNotFoundError(answerId);
    }
    /* istanbul ignore if */
    if ((await this.usersService.isUserExists(createdById)) == false) {
      throw new UserIdNotFoundError(createdById);
    }
    const oleRelation =
      await this.prismaService.answerFavoritedByUser.findUnique({
        where: {
          answerId_userId: {
            answerId,
            userId: createdById,
          },
        },
      });
    if (oleRelation != null) {
      throw new AnswerAlreadyFavoriteError(answerId);
    }
    await this.prismaService.answerFavoritedByUser.create({
      data: {
        answerId,
        userId: createdById,
      },
    });
  }

  async unfavoriteAnswer(
    questionId: number,
    answerId: number,
    createdById: number,
  ): Promise<void> {
    if ((await this.isAnswerExists(questionId, answerId)) == false) {
      throw new AnswerNotFoundError(answerId);
    }

    /* istanbul ignore if */
    if ((await this.usersService.isUserExists(createdById)) == false) {
      throw new UserIdNotFoundError(createdById);
    }

    const oleRelation =
      await this.prismaService.answerFavoritedByUser.findUnique({
        where: {
          answerId_userId: {
            answerId,
            userId: createdById,
          },
        },
      });
    if (oleRelation == null) {
      throw new AnswerNotFavoriteError(answerId);
    }
    await this.prismaService.answerFavoritedByUser.delete({
      where: {
        answerId_userId: {
          answerId,
          userId: createdById,
        },
      },
    });
  }

  async isAnswerExists(questionId: number, answerId: number): Promise<boolean> {
    return (
      (await this.prismaService.answer.count({
        where: {
          questionId,
          id: answerId,
        },
      })) > 0
    );
  }

  async isAnswerExistsAcrossQuestions(answerId: number): Promise<boolean> {
    return (
      (await this.prismaService.answer.count({
        where: {
          id: answerId,
        },
      })) > 0
    );
  }

  async getCreatedById(questionId: number, answerId: number): Promise<number> {
    const answer = await this.prismaService.answer.findUnique({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    return answer.createdById;
  }

  async countQuestionAnswers(questionId: number): Promise<number> {
    if ((await this.questionsService.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    return await this.prismaService.answer.count({
      where: {
        questionId,
      },
    });
  }

  async setAttitudeToAnswer(
    questionId: number,
    answerId: number,
    userId: number,
    attitude: AttitudeType,
  ): Promise<AttitudeStateDto> {
    const answer = await this.prismaService.answer.findUnique({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    await this.attitudeService.setAttitude(
      userId,
      AttitudableType.ANSWER,
      answerId,
      attitude,
    );
    return this.attitudeService.getAttitudeStatusDto(
      AttitudableType.ANSWER,
      answerId,
      userId,
    );
  }

  async getAnswerCount(userId: number): Promise<number> {
    return await this.prismaService.answer.count({
      where: {
        createdById: userId,
      },
    });
  }

  async getAnswerIdOfCreatedBy(
    questionId: number,
    createdById: number,
  ): Promise<number | undefined> {
    const answer = await this.prismaService.answer.findFirst({
      where: {
        questionId,
        createdById,
      },
    });
    return answer?.id; // return undefined if answer == undefined
  }
}

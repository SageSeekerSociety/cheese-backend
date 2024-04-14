//
//  In this file, in the parameters of all methods except those whose name is ended with 'AcrossQuestions'
//  an answer id should always be after a question id, which can be used as the sharding key in the future.
//

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttitudableType, AttitudeType } from '@prisma/client';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { CommentsService } from '../comments/comment.service';
import { CommentableType } from '../comments/commentable.enum';
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
  AlreadyHasSameAttitudeError,
  AnswerAlreadyFavoriteError,
  AnswerNotFavoriteError,
  AnswerNotFoundError,
  QuestionAlreadyAnsweredError,
} from './answer.error';
import {
  Answer,
  AnswerAttitudeAgree,
  AnswerAttitudeUndefined,
  AnswerDeleteLog,
  AnswerQueryLog,
  AnswerUpdateLog,
  AnswerUserAttitude,
} from './answer.legacy.entity';

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
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    @InjectRepository(AnswerUserAttitude)
    private readonly userAttitudeRepository: Repository<AnswerUserAttitude>,
    @InjectRepository(AnswerQueryLog)
    private readonly answerQueryLogRepository: Repository<AnswerQueryLog>,
    @InjectRepository(AnswerUpdateLog)
    private readonly answerUpdateLogRepository: Repository<AnswerUpdateLog>,
    @InjectRepository(AnswerDeleteLog)
    private readonly answerDeleteLogRepository: Repository<AnswerDeleteLog>,
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

    const answer = this.answerRepository.create({
      questionId,
      createdById,
      content,
    });
    const createdAnswer = await this.answerRepository.save(answer);
    return createdAnswer.id;
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
      const currPage = await this.answerRepository.find({
        where: { questionId },
        order: { id: 'ASC' },
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
      const start = await this.answerRepository.findOneBy({ id: pageStart });
      if (!start) {
        throw new AnswerNotFoundError(pageStart);
      }
      const prevPage = await this.answerRepository.find({
        where: {
          questionId,
          id: LessThan(pageStart),
        },
        order: { id: 'DESC' },
        take: pageSize,
      });
      const currPage = await this.answerRepository.find({
        where: {
          questionId,
          id: MoreThanOrEqual(pageStart),
        },
        order: { id: 'ASC' },
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
      const currPage = await this.answerRepository.find({
        where: { createdById: userId },
        order: { id: 'ASC' },
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
      const prevPage = await this.answerRepository.find({
        where: {
          createdById: userId,
          id: LessThan(pageStart),
        },
        order: { id: 'DESC' },
        take: pageSize,
      });
      const currPage = await this.answerRepository.find({
        where: {
          createdById: userId,
          id: MoreThanOrEqual(pageStart),
        },
        order: { id: 'ASC' },
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
  async getViewCountOfAnswer(
    questionId: number,
    answerId: number,
  ): Promise<number> {
    return await this.answerQueryLogRepository.count({
      where: { answerId },
    });
  }

  // questionId is reserved for sharding
  async getAgreeType(
    questionId: number,
    answerId: number,
    userId: number | undefined,
  ): Promise<number> {
    if (userId == undefined) return AnswerAttitudeUndefined;
    const userAttitude = await this.userAttitudeRepository.findOne({
      where: { userId, answerId },
    });
    if (userAttitude) {
      return userAttitude.type;
    } else {
      return AnswerAttitudeUndefined;
    }
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
      CommentableType.ANSWER,
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
      await this.answerQueryLogRepository.save({
        answerId,
        viewerId,
        ip,
        userAgent,
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
    const answer = await this.answerRepository.findOne({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const oldContent = answer.content;
    answer.content = content;
    await this.answerRepository.save(answer);

    const log = this.answerUpdateLogRepository.create({
      updaterId,
      answerId,
      oldContent,
      newContent: content,
    });
    await this.answerUpdateLogRepository.save(log);
  }

  async deleteAnswer(
    questionId: number,
    answerId: number,
    deleterId: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    await this.answerRepository.softRemove(answer);

    const log = this.answerDeleteLogRepository.create({
      deleterId,
      answerId,
    });
    await this.answerDeleteLogRepository.save(log);
  }

  // questionId is reserved for sharding
  async getAgreeCount(questionId: number, answerId: number): Promise<number> {
    return await this.userAttitudeRepository.count({
      where: { answerId, type: AnswerAttitudeAgree },
    });
  }

  async agreeAnswer(
    questionId: number,
    answerId: number,
    userId: number,
    agreeType: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOneBy({
      questionId,
      id: answerId,
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    // check if the user has already agreed or disagreed
    const userAttitude = await this.userAttitudeRepository.findOne({
      where: { userId, answerId },
    });
    if (userAttitude) {
      if (userAttitude.type == agreeType) {
        throw new AlreadyHasSameAttitudeError(userId, answerId, agreeType);
      }
      userAttitude.type = agreeType;
      await this.userAttitudeRepository.save(userAttitude);
    } else {
      await this.userAttitudeRepository.save({
        userId,
        answerId,
        type: agreeType,
      });
    }
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
      (await this.answerRepository.countBy({
        questionId,
        id: answerId,
      })) > 0
    );
  }

  async isAnswerExistsAcrossQuestions(answerId: number): Promise<boolean> {
    return (
      (await this.answerRepository.countBy({
        id: answerId,
      })) > 0
    );
  }

  async getCreatedById(questionId: number, answerId: number): Promise<number> {
    const answer = await this.answerRepository.findOneBy({
      questionId,
      id: answerId,
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    return answer.createdById;
  }

  async countQuestionAnswers(questionId: number): Promise<number> {
    if ((await this.questionsService.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    return this.answerRepository.countBy({
      questionId: questionId,
    });
  }

  async setAttitudeToAnswer(
    questionId: number,
    answerId: number,
    userId: number,
    attitude: AttitudeType,
  ): Promise<AttitudeStateDto> {
    const answer = await this.answerRepository.findOneBy({
      questionId,
      id: answerId,
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
    return await this.answerRepository.countBy({ createdById: userId });
  }

  async getAnswerIdOfCreatedBy(
    questionId: number,
    createdById: number,
  ): Promise<number | undefined> {
    const answer = await this.answerRepository.findOne({
      where: {
        deletedAt: undefined,
        questionId,
        createdById,
      },
    });
    return answer?.id; // return undefined if answer == undefined
  }
}

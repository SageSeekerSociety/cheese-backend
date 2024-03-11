//
//  In this file, in the parameters of all methods except those whose name is ended with 'AcrossQuestions'
//  an answer id should always be after a question id, which can be used as the sharding key in the future.
//

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { QuestionsService } from '../questions/questions.service';
import { QuestionIdNotFoundError } from '../questions/questions.error';
import { UserIdNotFoundError } from '../users/users.error';
import { User } from '../users/users.legacy.entity';
import { UsersService } from '../users/users.service';
import { AnswerDto } from './DTO/answer.dto';
import {
  AlreadyHasSameAttitudeError,
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
    private usersService: UsersService,
    @Inject(forwardRef(() => QuestionsService))
    private questionsService: QuestionsService,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(AnswerUserAttitude)
    private userAttitudeRepository: Repository<AnswerUserAttitude>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AnswerQueryLog)
    private readonly answerQueryLogRepository: Repository<AnswerQueryLog>,
    @InjectRepository(AnswerUpdateLog)
    private readonly answerUpdateLogRepository: Repository<AnswerUpdateLog>,
    @InjectRepository(AnswerDeleteLog)
    private readonly answerDeleteLogRepository: Repository<AnswerDeleteLog>,
  ) {}

  async createAnswer(
    questionId: number,
    createdById: number,
    content: string,
  ): Promise<number> {
    const existingAnswerId = await this.questionsService.getAnswerIdOfCreatedBy(
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
    viewerId?: number,
    userAgent?: string,
    ip?: string,
  ): Promise<[AnswerDto[], PageRespondDto]> {
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
            userAgent,
            ip,
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
            userAgent,
            ip,
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
    createdById: number | undefined,
  ): Promise<boolean> {
    if (createdById == undefined) return false;
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    return answer.favoritedBy.some((user) => user.id === createdById);
  }

  async getAnswerDto(
    questionId: number,
    answerId: number,
    viewerId?: number,
    userAgent?: string,
    ip?: string,
  ): Promise<AnswerDto> {
    const answer = await this.answerRepository.findOne({
      where: {
        questionId,
        id: answerId,
      },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    const authorDto = await this.usersService.getUserDtoById(
      answer.createdById,
      viewerId,
      ip,
      userAgent,
    );

    const log = this.answerQueryLogRepository.create({
      answerId,
      viewerId,
      userAgent,
      ip,
    });
    await this.answerQueryLogRepository.save(log);

    return {
      id: answer.id,
      question_id: answer.questionId,
      content: answer.content,
      author: authorDto,
      created_at: answer.createdAt.getTime(),
      updated_at: answer.updatedAt.getTime(),
      favorite_count: answer.favoritedBy?.length ?? 0,
      view_count: await this.getViewCountOfAnswer(questionId, answerId),
      agree_count: await this.getAgreeCount(questionId, answerId),
      agree_type: await this.getAgreeType(questionId, answerId, viewerId),
      is_favorite: await this.isFavorite(questionId, answerId, viewerId),
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
      where: { userId, answerId: answerId },
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
        answerId: answerId,
        type: agreeType,
      });
    }
  }

  async favoriteAnswer(
    questionId: number,
    answerId: number,
    createdById: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: {
        questionId,
        id: answerId,
      },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const user = await this.userRepository.findOneBy({ id: createdById });
    /* istanbul ignore if */
    if (!user) {
      throw new UserIdNotFoundError(createdById);
    }
    if (
      !answer.favoritedBy.some((favoritedUser) => favoritedUser.id === user.id)
    ) {
      answer.favoritedBy.push(user);
    }
    await this.answerRepository.save(answer);
  }

  async unfavoriteAnswer(
    questionId: number,
    answerId: number,
    createdById: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: {
        questionId,
        id: answerId,
      },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const user = await this.userRepository.findOneBy({ id: createdById });
    /* istanbul ignore if */
    if (!user) {
      throw new UserIdNotFoundError(createdById);
    }

    if (
      answer.favoritedBy.some((favoriteUser) => favoriteUser.id === user.id)
    ) {
      const index = answer.favoritedBy.indexOf(user);
      answer.favoritedBy.splice(index, 1);
    } else {
      throw new AnswerNotFavoriteError(answerId);
    }

    await this.answerRepository.save(answer);
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
      throw new QuestionIdNotFoundError(questionId);
    return this.answerRepository.countBy({
      questionId: questionId,
    });
  }
}

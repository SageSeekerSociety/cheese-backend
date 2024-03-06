import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { UserIdNotFoundError } from '../users/users.error';
import { User } from '../users/users.legacy.entity';
import { UsersService } from '../users/users.service';
import { QuestionsService } from '../questions/questions.service';
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
    const questionDto = await this.questionsService.getQuestionDto(questionId);
    if (questionDto.is_answered)
      throw new QuestionAlreadyAnsweredError(
        createdById,
        questionId,
        questionDto.my_answer_id,
      );

    // const ans = await this.answerRepository.findOne({
    //   where: { createdById, questionId },
    // });
    // if (ans) {
    //   throw new QuestionAlreadyAnsweredError(createdById, questionId, ans.id);
    // }
    const answer = this.answerRepository.create({
      questionId,
      createdById: createdById,
      content,
    });
    const createdAnswer = await this.answerRepository.save(answer);
    return createdAnswer.id;
  }

  async getQuestionAnswers(
    questionId: number | undefined,
    pageStart: number | undefined,
    pageSize: number,
    viewerId?: number,
    userAgent?: string,
    ip?: string,
  ): Promise<[AnswerDto[], PageRespondDto]> {
    if (!pageStart) {
      const currPage = await this.answerRepository.find({
        where: { questionId },
        order: { createdAt: 'ASC' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(entity.id, viewerId, userAgent, ip);
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
          createdAt: LessThan(start.createdAt),
        },
        order: { createdAt: 'DESC' },
        take: pageSize,
      });
      const currPage = await this.answerRepository.find({
        where: {
          questionId,
          createdAt: MoreThanOrEqual(start.createdAt),
        },
        order: { createdAt: 'ASC' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getAnswerDto(entity.id, viewerId, userAgent, ip);
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

  async getViewCountOfAnswer(answerId: number): Promise<number> {
    return await this.answerQueryLogRepository.count({
      where: { answerId },
    });
  }

  async getAgreeType(
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

  async isFavorite(
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
    answerId: number,
    viewerId?: number,
    userAgent?: string,
    ip?: string,
  ): Promise<AnswerDto> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
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
      view_count: await this.getViewCountOfAnswer(answerId),
      agree_count: await this.getAgreeCount(answerId),
      agree_type: await this.getAgreeType(answerId, viewerId),
      is_favorite: await this.isFavorite(answerId, viewerId),
    };
  }

  async updateAnswer(
    createdById: number,
    answerId: number,
    content: string,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const oldContent = answer.content;
    answer.content = content;
    await this.answerRepository.save(answer);

    const log = this.answerUpdateLogRepository.create({
      updaterId: createdById,
      answerId,
      oldContent,
      newContent: content,
    });
    await this.answerUpdateLogRepository.save(log);
  }

  async deleteAnswer(answerId: number, deleterId: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
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

  async getAgreeCount(answerId: number): Promise<number> {
    return await this.userAttitudeRepository.count({
      where: { answerId, type: AnswerAttitudeAgree },
    });
  }

  async agreeAnswer(
    id: number,
    userId: number,
    agreeType: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOneBy({ id });
    if (!answer) {
      throw new AnswerNotFoundError(id);
    }

    // maybe need to check if the user has already agreed or disagreed
    const userAttitude = await this.userAttitudeRepository.findOne({
      where: { userId, answerId: id },
    });
    if (userAttitude) {
      if (userAttitude.type == agreeType) {
        throw new AlreadyHasSameAttitudeError(userId, id, agreeType);
      }
      userAttitude.type = agreeType;
      await this.userAttitudeRepository.save(userAttitude);
    } else {
      await this.userAttitudeRepository.save({
        userId,
        answerId: id,
        type: agreeType,
      });
    }
  }

  async favoriteAnswer(id: number, createdById: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(id);
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

  async unfavoriteAnswer(answerId: number, createdById: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
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

  async isAnswerExists(answerId: number): Promise<boolean> {
    return (await this.answerRepository.countBy({ id: answerId })) > 0;
  }
}

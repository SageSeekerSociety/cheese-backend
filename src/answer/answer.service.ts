//返回dto，不要返回实体——参见API的answer，就是要返回dto
//看group怎么拿Id
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { UserIdNotFoundError } from '../users/users.error';
import { User } from '../users/users.legacy.entity';
import { UsersService } from '../users/users.service';
import { AgreeAnswerDto } from './DTO/agree-answer.dto';
import { AnswerDto } from './DTO/answer.dto';
import { Answer, UserAttitudeOnAnswer } from './answer.entity';
import {
  AlreadyHasSameAttitudeError,
  AnswerNotFavoriteError,
  AnswerNotFoundError,
} from './answer.error';
@Injectable()
export class AnswerService {
  constructor(
    private usersService: UsersService,
    // private questionsService: QuestionsService,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(UserAttitudeOnAnswer)
    private userAttitudeRepository: Repository<UserAttitudeOnAnswer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createAnswer(
    questionId: number,
    userId: number,
    content: string,
  ): Promise<number> {
    const createdAnswer = this.answerRepository.create({
      questionId,
      userId,
      content,
    });
    createdAnswer.is_group = false;
    await this.answerRepository.save(createdAnswer);

    const answerId = createdAnswer.id;
    const userAttitude = this.userAttitudeRepository.create({
      userId,
      answerId: answerId,
    });
    await this.userAttitudeRepository.save(userAttitude);
    // const userDto = await this.usersService.getUserDtoById(userId);
    return createdAnswer.id;
  }

  async getQuestionAnswers(
    questionId: number | undefined,
    page_start: number | undefined,
    page_size: number,
  ): Promise<[AnswerDto[], PageRespondDto]> {
    const queryBuilder = this.answerRepository
      .createQueryBuilder('answer')
      .where('answer.questionId = :questionId', { questionId })
      .orderBy('answer.createdAt');
    let prevPage = undefined,
      currPage = undefined;
    /* istanbul ignore if */
    if (!page_start) {
      currPage = await queryBuilder.limit(page_size + 1).getMany();
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          const userId = entity.id;
          return this.getAnswerById(userId, questionId, entity.id);
        }),
      );
      return PageHelper.PageStart(currDto, page_size, (answer) => answer.id);
    } else {
      const start = await this.answerRepository.findOneBy({ id: page_start });
      /* istanbul ignore if */
      if (!start) {
        throw new AnswerNotFoundError(page_start);
      }
      const queryBuilderCopy = queryBuilder.clone();
      prevPage = await queryBuilder
        .orderBy('id', 'ASC')
        .andWhere('id > :page_start', { page_start })
        .limit(page_size)
        .getMany();
      currPage = await queryBuilderCopy
        .orderBy('id', 'DESC')
        .andWhere('id <= :page_start', { page_start })
        .limit(page_size + 1)
        .getMany();

      // const currDto = await Promise.all(currPage.map(async (entity) => {
      //     const userId = await this.getUserByAnswer(entity.id);
      //     return this.getAnswerById(userId, questionId, entity.id);
      // }));
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          const userId = entity.id;
          return this.getAnswerById(userId, questionId, entity.id);
        }),
      );
      return PageHelper.PageMiddle(
        prevPage,
        currDto,
        page_size,
        (answer) => answer.id,
        (answer) => answer.id,
      );
    }
  }

  async getAnswerById(
    userId: number,
    questionId: number | undefined,
    answerId: number,
  ): Promise<AnswerDto> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    const userDto = await this.usersService.getUserDtoById(userId);

    return {
      id: answer.id,
      question_id: answer.questionId,
      content: answer.content,
      author: userDto,
      created_at: answer.createdAt.getTime(),
      updated_at: answer.updatedAt.getTime(),
      favorite_count: answer.favoritedBy?.length ?? 0,
    };
  }

  async updateAnswer(
    userId: number,
    answerId: number,
    content: string,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });

    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    // Update the answer with the data from the DTO
    answer.content = content;

    // Save the updated answer
    await this.answerRepository.save(answer);
  }

  async deleteAnswer(
    userId: number,
    questionId: number,
    answerId: number,
  ): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }
    await this.answerRepository.softRemove(answer);
  }

  async agreeAnswer(
    id: number,
    userId: number,
    agree_type: number,
  ): Promise<AgreeAnswerDto> {
    const answer = await this.answerRepository.findOneBy({ id });
    const userDto = await this.usersService.getUserDtoById(userId);

    if (!answer) {
      throw new AnswerNotFoundError(id);
    }

    // maybe need to check if the user has already agreed or disagreed
    const userAttitude = await this.userAttitudeRepository.findOne({
      where: { userId, answerId: id },
    });

    /* istanbul ignore else */
    if (userAttitude) {
      if (userAttitude.type == agree_type) {
        throw new AlreadyHasSameAttitudeError(userId, id, agree_type);
      }
      userAttitude.type = agree_type;
      await this.userAttitudeRepository.save(userAttitude);
    } else {
      await this.userAttitudeRepository.save({
        userId,
        answerId: id,
        type: agree_type,
      });
    }

    const agree_count = await this.userAttitudeRepository.count({
      where: { answerId: id, type: 1 },
    });
    const disagree_count = await this.userAttitudeRepository.count({
      where: { answerId: id, type: 2 },
    });
    await this.answerRepository.save(answer);
    return {
      id: answer.id,
      question_id: answer.questionId,
      content: answer.content,
      author: userDto,
      agree_type,
      agree_count,
      disagree_count,
    };
  }

  async favoriteAnswer(id: number, userId: number): Promise<AnswerDto> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(id);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    /* istanbul ignore if */
    if (!user) {
      throw new UserIdNotFoundError(userId);
    }
    /* istanbul ignore if */
    if (!answer.favoritedBy) {
      answer.favoritedBy = [user];
    } else {
      if (
        !answer.favoritedBy.some(
          (favoritedUser) => favoritedUser.id === user.id,
        )
      ) {
        answer.favoritedBy.push(user);
      }
    }
    // let favoriteCount;
    // if (!answer.favoritedBy.length) {
    //   favoriteCount = 0;
    // } else {
    //   favoriteCount = answer.favoritedBy.length;
    // }
    const favorite_count = answer.favoritedBy.length;
    const userDto = await this.usersService.getUserDtoById(userId);
    await this.answerRepository.save(answer);
    return {
      id: answer.id,
      question_id: answer.questionId,
      content: answer.content,
      author: userDto,
      created_at: answer.createdAt.getTime(),
      updated_at: answer.updatedAt.getTime(),
      favorite_count: favorite_count,
    };
  }

  async unfavoriteAnswer(answerId: number, userId: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['favoritedBy'],
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    /* istanbul ignore if */
    if (!user) {
      throw new UserIdNotFoundError(userId);
    }

    if (
      answer.favoritedBy &&
      answer.favoritedBy.some((favoriteUser) => favoriteUser.id === user.id)
    ) {
      const index = answer.favoritedBy.indexOf(user);
      answer.favoritedBy.splice(index, 1);
    } else {
      throw new AnswerNotFavoriteError(answerId);
    }

    await this.answerRepository.save(answer);
  }
}

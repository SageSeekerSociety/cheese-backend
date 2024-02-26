//返回dto，不要返回实体——参见API的answer，就是要返回dto
//看group怎么拿Id
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { User } from '../users/users.entity';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { AgreeAnswerDto } from './DTO/agree-answer.dto';
import { AnswerDto } from './DTO/answer.dto';
import { CreateAnswerRespondDto } from './DTO/create-answer.dto';
import { Answer, UserAttitudeOnAnswer } from './answer.entity';
import { AnswerAlreadyAgreeError, AnswerAlreadyUnfavoriteError, AnswerNotFoundError } from './answer.error';
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

  async createAnswer(questionId:number,userId: number, content: string): Promise<CreateAnswerRespondDto> {
    
    const createdAnswer = this.answerRepository.create({questionId, userId, content });
    createdAnswer.is_group=false;
    await this.answerRepository.save(createdAnswer);
    // const userDto = await this.usersService.getUserDtoById(userId);
    return {
      answerId: createdAnswer.id,
    };
    // return {
    //   id: createdAnswer.id,
    //   question_id: createdAnswer.question_Id,
    //   content: createdAnswer.content,
    //   author: userDto,
    //   created_at: createdAnswer.createdAt.getTime(),
    //   updated_at: createdAnswer.updatedAt.getTime(),
    //   favorite_count: createdAnswer.favoritedBy.length,
    // };
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
      favorite_count: answer.favoritedBy?.length??0,
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
    await this.answerRepository.delete(answerId);
  }

  async agreeAnswer(
    id: number,
    userId: number,
    agree_type: number,
  ): Promise<AgreeAnswerDto> {
    const answer = await this.answerRepository.findOne({ where: { id } });
    const userDto = await this.usersService.getUserDtoById(userId);

    if (!answer) {
      throw new AnswerNotFoundError(id);
    }

    const userAttitude = this.userAttitudeRepository.create();
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UserIdNotFoundError(userId);
    }
    userAttitude.answerId = id;
    userAttitude.type = agree_type;
    userAttitude.user = user;
    userAttitude.userId = userId;
    userAttitude.answer = answer;

    if (!answer.attitudes) {
      answer.attitudes = [userAttitude];
    } 
    else if(answer.attitudes.includes(userAttitude)){
      throw new AnswerAlreadyAgreeError(id);
    }
    else {
      answer.attitudes.push(userAttitude);
    }

    
    await this.answerRepository.save(answer);

    const len = answer.attitudes.length;
    let agree_count = 0,
      disagree_count = 0;
    for (let i = 0; i < len; i++) {
      if (answer.attitudes[i].type == 1) {
        agree_count += 1;
      } else {
        disagree_count += 1;
      }
    }
    return {
      id: userId,
      question_id: answer.questionId,
      content: answer.content,
      author: userDto,
      agree_type: agree_type,
      agree_count: agree_count,
      disagree_count: disagree_count,
    };
  }

  async favoriteAnswer(id: number, userId: number): Promise<AnswerDto> {
    const answer = await this.answerRepository.findOne({ where: { id } });
    if (!answer) {
      throw new AnswerNotFoundError(id);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UserIdNotFoundError(userId);
    }

    if (!answer.favoritedBy) {
      answer.favoritedBy = [user];
    } else {
      if (!answer.favoritedBy.includes(user)) {
        answer.favoritedBy.push(user);
      }
    }
    let favoriteCount;
    if(!answer.favoritedBy.length){
      favoriteCount = 0;
    }
    else{
      favoriteCount = answer.favoritedBy.length;
    }
    // const favorite_count = answer.favoritedBy.length;
    const userDto = await this.usersService.getUserDtoById(userId);
    await this.answerRepository.save(answer);
    return {
      id: userId,
      question_id: answer.questionId,
      content: answer.content,
      author: userDto,
      created_at: answer.createdAt.getTime(),
      updated_at: answer.updatedAt.getTime(),
      favorite_count: favoriteCount,
    };
  }

  async unfavoriteAnswer(answerId: number, userId: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });
    if (!answer) {
      throw new AnswerNotFoundError(answerId);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UserIdNotFoundError(userId);
    }

    if(!answer.favoritedBy){
      throw new AnswerAlreadyUnfavoriteError(answerId);
    }
    if (answer.favoritedBy && answer.favoritedBy.includes(user)) {
      const index = answer.favoritedBy.indexOf(user);
      answer.favoritedBy.splice(index);
    } //else {
      // throw new AnswerAlreadyUnfavoriteError(answerId);
      // this.favoriteAnswer(answerId, userId);
    // }

    // const userDto = await this.usersService.getUserDtoById(userId);
    await this.answerRepository.save(answer);
  }
}

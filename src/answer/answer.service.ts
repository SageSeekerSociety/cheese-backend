//返回dto，不要返回实体——参见API的answer，就是要返回dto
//看group怎么拿Id
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { UsersService } from '../users/users.service';
import { AgreeAnswerDto } from './DTO/agree-answer.dto';
import { AnswerDto } from './DTO/answer.dto';
import { Answer } from './answer.entity';
import { AnswerAlreadyAgreeError, AnswerAlreadyFavoriteError, AnswerAlreadyUnfavoriteError, AnswerNotFoundError } from './answer.error';

@Injectable()
export class AnswerService {
    constructor(
        private usersService: UsersService,
        // private questionsService: QuestionsService,
        @InjectRepository(Answer)
        private answerRepository: Repository<Answer>,
    ) {}
    
    async createAnswer(
        userId: number,
        content: string,
    ): Promise<AnswerDto> {
        const createdAnswer = this.answerRepository.create({content});
        await this.answerRepository.save(createdAnswer);
        const userDto = await this.usersService.getUserDtoById(userId);
        return {
            id: createdAnswer.id,
            question_id: createdAnswer.question_Id,
            content: createdAnswer.content,
            author: userDto,
            created_at: createdAnswer.createdAt.getTime(),
            updated_at: createdAnswer.updatedAt.getTime(),
            // agree_type: 0,
        };
    }

    async getQuestionAnswers(
        questionId: number | undefined, 
        page_start: number | undefined, 
        page_size: number
    ): Promise<[AnswerDto[], PageRespondDto]> {
        const queryBuilder = this.answerRepository
        .createQueryBuilder('answer')
        .where('answer.questionId = :questionId', { questionId })
        .orderBy('answer.createdAt');
        let prevPage = undefined, currPage = undefined;
        if(!page_start){
            currPage = await queryBuilder.limit(page_size + 1).getMany();
            const currDto = await Promise.all(currPage.map(async (entity) => {
                const userId = entity.id; 
                return this.getAnswerById(userId, questionId, entity.id);
            }));            
            return PageHelper.PageStart(
                currDto,
                page_size,
                (answer) => answer.id,
            );
        }
        else{
            const start = await this.answerRepository.findOneBy({id: page_start});
            if (!start){
                throw new AnswerNotFoundError(page_start);
            }
            const queryBuilderCopy = queryBuilder.clone();
            prevPage = await queryBuilder
                .orderBy('id', 'ASC')
                .andWhere('id > :page_start', {page_start})
                .limit(page_size)
                .getMany();
            currPage = await queryBuilderCopy
                .orderBy('id', 'DESC')
                .andWhere('id <= :page_start', {page_start})
                .limit(page_size + 1)
                .getMany();

            // const currDto = await Promise.all(currPage.map(async (entity) => {
            //     const userId = await this.getUserByAnswer(entity.id);
            //     return this.getAnswerById(userId, questionId, entity.id);
            // }));
            const currDto = await Promise.all(currPage.map(async (entity) => {
                const userId = entity.id; 
                return this.getAnswerById(userId, questionId, entity.id);
            }));
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
            where: {id: answerId},
        });
        if (answer == undefined){
            throw new AnswerNotFoundError(answerId);
        }
        const userDto = await this.usersService.getUserDtoById(userId);
        return {
            id: answer.id,
            question_id: answer.question_Id,
            content: answer.content,
            author: userDto,
            created_at: answer.createdAt.getTime(),
            updated_at: answer.updatedAt.getTime(),
            // agree_type: answer.agree_type,
        };
    }

    async updateAnswer(
      userId: number,
      answerId: number,
      content: string,
    ): Promise<void> {
        const answer = await this.answerRepository.findOne({ where: { id: answerId } });

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
            where: {id: answerId},
        });
        if (!answer){
            throw new AnswerNotFoundError(answerId);
        }
        await this.answerRepository.delete(answerId);
    }

    async agreeAnswer(id: number, userId: number, agree_type: number): Promise<AgreeAnswerDto> {
        const answer = await this.answerRepository.findOne({ where: { id }});

        if (!answer) {
            throw new AnswerNotFoundError(id);
        }

        if (answer.agrees && answer.agrees.includes(`${userId}`)) {
            throw new AnswerAlreadyAgreeError(id);
        }

        if (!answer.agrees) {
            answer.agrees = [`${userId}`];
        } 
        else {
            if(agree_type == 1){
                answer.agrees.push(`${userId}`);
                answer.agree_count = (answer.agree_count || 0) + 1;
            }  
            else{
                answer.disagrees.push(`${userId}`);
                answer.disagree_count = (answer.disagree_count || 0) + 1;
            }
        }
        await this.answerRepository.save(answer);   
        const userDto = await this.usersService.getUserDtoById(userId);
        return {
            id: userId,
            question_id: answer.question_Id,
            content: answer.content,
            author: userDto,
            agree_type: agree_type,
            agree_count: answer.agree_count,
        };
    }
    
    async favoriteAnswer(id: number, userId: number): Promise<AnswerDto> {
        const answer = await this.answerRepository.findOne({ where: { id }});
        if (!answer) {
            throw new AnswerNotFoundError(id);
        }

        if (answer.is_favorite&& answer.favoritedBy.includes(`${userId}`)) {
            throw new AnswerAlreadyFavoriteError(id);
        }
        if (!answer.favoritedBy) {
            answer.favoritedBy = [`${userId}`]; 
          } else {
            if (!answer.favoritedBy.includes(`${userId}`)) {
              answer.favoritedBy.push(`${userId}`); 
            }
          }
        answer.is_favorite = true;
        answer.favorite_count = (answer.favorite_count || 0) + 1;
        const userDto = await this.usersService.getUserDtoById(userId);
        await this.answerRepository.save(answer);
        return {
            id: userId,
            question_id: answer.question_Id,
            content: answer.content,
            author: userDto,
            created_at: answer.createdAt.getTime(),
            updated_at: answer.updatedAt.getTime(),
        };
    }

    async unfavoriteAnswer(answerId: number, userId: number): Promise<void>{
        const answer = await this.answerRepository.findOne({where: {id: answerId}});
        if(!answer){
            throw new AnswerNotFoundError(answerId);
        }
        if (answer.is_favorite&& answer.favoritedBy.includes(`${userId}`)) {
            answer.favorite_count -= 1;
            answer.is_favorite = false;
            const index = answer.favoritedBy.indexOf(`${userId}`);
            answer.favoritedBy.splice(index);
        }
        else{
            throw new AnswerAlreadyUnfavoriteError(answerId);
        }

        // const userDto = await this.usersService.getUserDtoById(userId);
        await this.answerRepository.save(answer);
    }

   
}
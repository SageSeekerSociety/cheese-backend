import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { Answer } from './answer.entity';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswerService {
    constructor(
        @InjectRepository(Answer)
        private answerRepository: Repository<Answer>,
    ) {}
    
    // 实现各种回答相关操作的方法
    async create(createAnswerDto: CreateAnswerDto): Promise<Answer> {
        const createdAnswer = this.answerRepository.create(createAnswerDto);
        return this.answerRepository.save(createdAnswer);
    }

    async getAnswersByQuestionId(questionId: string, page: number, limit: number, sortBy: string): Promise<Answer[]> {
        const skip = (page - 1) * limit;
        const queryBuilder = this.answerRepository
        .createQueryBuilder('answer')
        .where('answer.questionId = :questionId', { questionId })
        .orderBy(`answer.${sortBy}`, 'DESC')  // Assuming sortBy is a column name for sorting

        if (page && limit) {
            queryBuilder.skip(skip).take(limit);
        }

        return queryBuilder.getMany();
    }
    
    
    async updateAnswer(id: string, updateAnswerDto: UpdateAnswerDto): Promise<Answer> {
        const answer = await this.answerRepository.findOne({ where: { id } });

        if (!answer) {
          throw new Error('Answer not found');
        }
    
        // Update the answer with the data from the DTO
        answer.content = updateAnswerDto.content;
    
        // Save the updated answer
        return this.answerRepository.save(answer);
    }

    async deleteAnswer(id: string): Promise<void> {
        await this.answerRepository.delete(id);
    }

    // async likeAnswer(answerId: string, userId: string): Promise<Answer> {

    // }
    
    // async favoriteAnswer(answerId: string, userId: string): Promise<Answer> {
    //     // Implement logic to handle favoriting an answer
    // }
    
    // async commentOnAnswer(answerId: string, comment: string, userId: string): Promise<Answer> {

    // }
    
}

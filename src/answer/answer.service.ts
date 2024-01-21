import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//mport { AnswerModule } from './answer.module';
import { Answer } from './answer.entity';
import { CreateAnswerDto } from './DTO/create-answer.dto';
import { UpdateAnswerDto } from './DTO/update-answer.dto';

@Injectable()
export class AnswerService {
    constructor(
        @InjectRepository(Answer)
        private answerRepository: Repository<Answer>,
    ) {}
    
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

    async likeAnswer(id: string, userId: string): Promise<Answer> {
        // 查找要点赞的答案
        const answer = await this.answerRepository.findOne({ where: { id }});

        if (!answer) {
            throw new Error('Answer not found');
        }

        // 检查用户是否已经点过赞
        if (answer.likes && answer.likes.includes(userId)) {
            throw new Error('User already liked this answer');
        }

        // 更新点赞信息
        if (!answer.likes) {
        answer.likes = [userId];
        } else {
        answer.likes.push(userId);
        }

        // 更新点赞计数
        answer.likesCount = (answer.likesCount || 0) + 1;

        // 保存更新后的答案
        return this.answerRepository.save(answer);        
    }
    
    async favoriteAnswer(id: string, userId: string): Promise<Answer> {
        // 使用提供的 answerId 查询数据库中的特定答案实体
        const answer = await this.answerRepository.findOne({ where: { id }});

        // 检查答案是否存在
        if (!answer) {
            throw new Error('Answer not found');
        }

        if (answer.isFavorited && answer.favoritedBy.includes(userId)) {
            throw new Error('User already favorited this answer');
        }
        // 更新答案信息，例如将其标记为用户喜欢的答案
        if (!answer.favoritedBy) {
            answer.favoritedBy = [userId]; // 如果favoritedBy为空，创建一个新的列表并添加用户ID
          } else {
            if (!answer.favoritedBy.includes(userId)) {
              answer.favoritedBy.push(userId); // 如果用户ID不在列表中，添加用户ID
            }
          }
        answer.isFavorited = true;

        answer.favoriteCount = (answer.favoriteCount || 0) + 1;

        return this.answerRepository.save(answer);
    }
    
    async commentOnAnswer(id: string, comment: string, userId: string): Promise<Answer> {
        const answer = await this.answerRepository.findOne({ where: { id }});
        
        if (answer) {
            // 创建评论对象
            const newComment = {
                userId: userId,
                comment: comment,
                createdAt: new Date()
            };

            // 将评论添加到答案的评论列表中
            if (!answer.comments) {
            answer.comments = [newComment]; // 如果评论列表为空，创建一个新的列表并添加评论
            } else {
            answer.comments.push(newComment); // 如果评论列表不为空，直接添加评论
            }

            answer.commentCount = (answer.commentCount || 0) + 1;

            return this.answerRepository.save(answer); // 返回更新后的答案对象
        } else {
            throw new Error('Answer not found');
        }
    }
    
}

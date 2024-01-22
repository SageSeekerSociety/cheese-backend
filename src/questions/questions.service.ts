/*
 *  Description: This file implements the QuestionsService class.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from '../topics/topics.entity';
import { TopicNotFoundError } from '../topics/topics.error';
import { User } from '../users/users.entity';
import { UserIdNotFoundError } from '../users/users.error';
import { Question, QuestionTopicRelation } from './questions.entity';
import { QuestionNotFoundError } from './questions.error';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(QuestionTopicRelation)
    private readonly questionTopicRelationRepository: Repository<QuestionTopicRelation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async addTopicToQuestion(
    questionId: number,
    topicId: number,
    createdById: number,
  ): Promise<void> {
    const question = await this.questionRepository.findOneBy({ id: questionId });
    if (question == null)
      throw new QuestionNotFoundError(questionId);
    const topic = await this.topicRepository.findOneBy({ id: topicId });
    if (topic == null)
      throw new TopicNotFoundError(topicId);
    const createBy = await this.userRepository.findOneBy({ id: createdById });
    if (createBy == null)
      throw new UserIdNotFoundError(createdById);
    const relation = this.questionTopicRelationRepository.create({
      questionId,
      topicId,
      createdById,
    });
    await this.questionTopicRelationRepository.save(relation);
  }

  // returns: question id
  async addQuestion(
    askerUserId: number,
    title: string,
    content: string,
    type: number,
    topics: number[],
    groupId?: number,
  ): Promise<number> {
    // TODO: Validate groupId.
    const question = this.questionRepository.create({
      askerUserId,
      title,
      content,
      type,
      groupId,
    });
    await this.questionRepository.save(question);
    await Promise.all(topics.map(
      topicId => this.addTopicToQuestion(question.id, topicId, askerUserId)
    ));
    return question.id;
  }
}

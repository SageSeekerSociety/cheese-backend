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
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { TopicDto } from '../topics/DTO/topic.dto';
import { TopicNotFoundError } from '../topics/topics.error';
import { TopicsService } from '../topics/topics.service';
import { UserDto } from '../users/DTO/user.dto';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { QuestionDto } from './DTO/question.dto';
import {
  Question,
  QuestionFollowerRelation,
  QuestionQueryLog,
  QuestionTopicRelation,
} from './questions.entity';
import { QuestionNotFoundError } from './questions.error';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly userService: UsersService,
    private readonly topicService: TopicsService,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionTopicRelation)
    private readonly questionTopicRelationRepository: Repository<QuestionTopicRelation>,
    @InjectRepository(QuestionQueryLog)
    private readonly questionQueryLogRepository: Repository<QuestionQueryLog>,
    @InjectRepository(QuestionFollowerRelation)
    private readonly questionFollowRelationRepository: Repository<QuestionFollowerRelation>,
  ) {}

  async addTopicToQuestion(
    questionId: number,
    topicId: number,
    createdById: number,
  ): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionNotFoundError(questionId);
    const topic = await this.topicService.getTopicDtoById(topicId);
    if (topic == null) throw new TopicNotFoundError(topicId);
    const createBy = await this.userService.isUserExists(createdById);
    if (createBy == false) throw new UserIdNotFoundError(createdById);
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
      createdById: askerUserId,
      title,
      content,
      type,
      groupId,
    });
    await this.questionRepository.save(question);
    await Promise.all(
      topics.map((topicId) =>
        this.addTopicToQuestion(question.id, topicId, askerUserId),
      ),
    );
    return question.id;
  }

  async hasFollowedQuestion(
    userId: number, // nullable
    questionId: number,
  ): Promise<boolean> {
    if (userId == null) return false;
    const relation = await this.questionFollowRelationRepository.findOneBy({
      followerId: userId,
      questionId,
    });
    return relation != null;
  }

  // returns: a list of topicId
  async getTopicDtosOfQuestion(questionId: number): Promise<TopicDto[]> {
    const relations = await this.questionTopicRelationRepository.findBy({
      questionId,
    });
    return await Promise.all(
      relations.map((relation) =>
        this.topicService.getTopicDtoById(relation.topicId),
      ),
    );
  }

  async getFollowCountOfQuestion(questionId: number): Promise<number> {
    return await this.questionFollowRelationRepository.countBy({ questionId });
  }

  async getViewCountOfQuestion(questionId: number): Promise<number> {
    return await this.questionQueryLogRepository.countBy({ questionId });
  }

  async getQuestionDto(
    questionId: number,
    viewerId: number,
    ip: string,
    userAgent: string,
  ): Promise<QuestionDto> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionNotFoundError(questionId);
    const topicsPromise = this.getTopicDtosOfQuestion(questionId);
    const hasFollowedPromise = this.hasFollowedQuestion(viewerId, questionId);
    const followCountPromise = this.getFollowCountOfQuestion(questionId);
    const viewCountPromise = this.getViewCountOfQuestion(questionId);

    const [topics, hasFollowed, followCount, viewCount] = await Promise.all([
      topicsPromise,
      hasFollowedPromise,
      followCountPromise,
      viewCountPromise,
    ]);
    if (question == null) throw new QuestionNotFoundError(questionId);
    let user: UserDto = null;
    try {
      user = await this.userService.getUserDtoById(
        question.createdById,
        viewerId,
        ip,
        userAgent,
      );
    } catch (e) {
      // If user is null, it means that one user created this question, but the user
      // does not exist now. This is NOT a data integrity problem, since user can be
      // deleted. So we just return a null and not throw an error.
    }
    const log = this.questionQueryLogRepository.create({
      viewerId,
      questionId,
      ip,
      userAgent,
    });
    await this.questionQueryLogRepository.save(log);
    return {
      id: question.id,
      title: question.title,
      content: question.content,
      user,
      type: question.type,
      topics,
      created_at: question.createdAt.getTime(),
      updated_at: question.updatedAt.getTime(),
      is_follow: hasFollowed,
      is_like: false, // TODO: Implement this.
      answer_count: 0, // TODO: Implement this.
      comment_count: 0, // TODO: Implement this.
      follow_count: followCount,
      like_count: 0, // TODO: Implement this.
      view_count: viewCount,
      is_group: question.groupId != null,
      group: null, // TODO: Implement this.
    };
  }

  async searchQuestions(
    keywords: string,
    firstTopicId: number, // null if from start
    pageSize: number,
    searcherId: number, // nullable
    ip: string,
    userAgent: string,
  ): Promise<[QuestionDto[], PageRespondDto]> {
    throw new Error();
  }
}

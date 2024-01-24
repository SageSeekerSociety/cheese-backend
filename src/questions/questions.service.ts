/*
 *  Description: This file implements the QuestionsService class.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
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
  QuestionSearchLog,
  QuestionTopicRelation,
} from './questions.entity';
import { QuestionNotFoundError } from './questions.error';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly userService: UsersService,
    private readonly topicService: TopicsService,
    @InjectEntityManager()
    private readonly entityManager,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionTopicRelation)
    private readonly questionTopicRelationRepository: Repository<QuestionTopicRelation>,
    @InjectRepository(QuestionQueryLog)
    private readonly questionQueryLogRepository: Repository<QuestionQueryLog>,
    @InjectRepository(QuestionFollowerRelation)
    private readonly questionFollowRelationRepository: Repository<QuestionFollowerRelation>,
    @InjectRepository(QuestionSearchLog)
    private readonly questionSearchLogRepository: Repository<QuestionSearchLog>,
  ) {}

  async addTopicToQuestion(
    questionId: number,
    topicId: number,
    createdById: number,
    // for transaction
    omitQuestionExistsCheck: boolean = false,
    questionTopicRelationRepository?: Repository<QuestionTopicRelation>,
  ): Promise<void> {
    if (questionTopicRelationRepository == null)
      questionTopicRelationRepository = this.questionTopicRelationRepository;
    if (omitQuestionExistsCheck == false) {
      const question = await this.questionRepository.findOneBy({
        id: questionId,
      });
      if (question == null) throw new QuestionNotFoundError(questionId);
    }
    const topic = await this.topicService.getTopicDtoById(topicId);
    if (topic == null) throw new TopicNotFoundError(topicId);
    const createBy = await this.userService.isUserExists(createdById);
    if (createBy == false) throw new UserIdNotFoundError(createdById);
    const relation = questionTopicRelationRepository.create({
      questionId,
      topicId,
      createdById,
    });
    await questionTopicRelationRepository.save(relation);
  }

  // returns: question id
  async addQuestion(
    askerUserId: number,
    title: string,
    content: string,
    type: number,
    topicIds: number[],
    groupId?: number,
  ): Promise<number> {
    for (const topicId of topicIds) {
      const topic = await this.topicService.getTopicDtoById(topicId);
      if (topic == null) throw new TopicNotFoundError(topicId);
    }
    // TODO: Validate groupId.
    return this.entityManager.transaction(
      async (entityManager: EntityManager) => {
        const questionRepository = entityManager.getRepository(Question);
        const question = questionRepository.create({
          createdById: askerUserId,
          title,
          content,
          type,
          groupId,
        });
        await questionRepository.save(question);
        const questionTopicRelationRepository = entityManager.getRepository(
          QuestionTopicRelation,
        );
        await Promise.all(
          topicIds.map((topicId) =>
            this.addTopicToQuestion(
              question.id,
              topicId,
              askerUserId,
              true,
              questionTopicRelationRepository,
            ),
          ),
        );
        return question.id;
      },
    );
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
    if (questionId == null) throw new Error('questionId is null');
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
    firstQuestionId: number, // null if from start
    pageSize: number,
    searcherId: number, // nullable
    ip: string,
    userAgent: string,
  ): Promise<[QuestionDto[], PageRespondDto]> {
    const timeBegin = Date.now();
    if (firstQuestionId == null) {
      const questionIds = (await this.questionRepository
        .createQueryBuilder('question')
        // 'relevance' is used for sorting
        .select([
          'question.id',
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        // TypeORM uses query template to prevent SQL injection.
        // ':keywords' is translated to a parameter placeholder in the SQL query template,
        // so it cannot be injected.
        .where(
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE)',
        )
        .orderBy({ relevance: 'DESC', id: 'ASC' })
        .limit(pageSize + 1)
        .setParameter('keywords', keywords)
        .getRawMany()) as { question_id: number; relevance: number }[];
      const questionDtos = await Promise.all(
        questionIds.map((questionId) =>
          this.getQuestionDto(
            questionId.question_id,
            searcherId,
            ip,
            userAgent,
          ),
        ),
      );
      const log = this.questionSearchLogRepository.create({
        keywords,
        firstQuestionId,
        pageSize,
        result: questionIds.map((t) => t.question_id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId,
        ip,
        userAgent,
      });
      await this.questionSearchLogRepository.save(log);
      return PageHelper.PageStart(questionDtos, pageSize, (q) => q.id);
    } else {
      const relevanceCursorRaw = await this.questionRepository
        .createQueryBuilder('question')
        .select([
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where('id = :firstQuestionId')
        .setParameter('keywords', keywords)
        .setParameter('firstQuestionId', firstQuestionId)
        .getRawOne();
      if (relevanceCursorRaw == null)
        throw new QuestionNotFoundError(firstQuestionId);
      const relevanceCursor = relevanceCursorRaw.relevance as number;
      const prevPromise = this.questionRepository
        .createQueryBuilder('question')
        .select([
          'question.id',
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where(
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE)',
        )
        .andWhere(
          '(' +
            ' ROUND(MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) > ROUND(:relevanceCursor, 5)' +
            ' OR ROUND(MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) = ROUND(:relevanceCursor, 5)' +
            ' AND question.id < :firstQuestionId' +
            ')',
        )
        .orderBy({ relevance: 'ASC', id: 'DESC' })
        .limit(pageSize)
        .setParameter('keywords', keywords)
        .setParameter('relevanceCursor', relevanceCursor)
        .setParameter('firstQuestionId', firstQuestionId)
        .getRawMany() as Promise<{ question_id: number; relevance: number }[]>;
      const herePromise = this.questionRepository
        .createQueryBuilder('question')
        .select([
          'question.id',
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where(
          'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE)',
        )
        .andWhere(
          '(' +
            ' ROUND(MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) < ROUND(:relevanceCursor, 5)' +
            ' OR ROUND(MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) = ROUND(:relevanceCursor, 5)' +
            ' AND question.id >= :firstQuestionId' +
            ')',
        )
        .orderBy({ relevance: 'DESC', id: 'ASC' })
        .limit(pageSize + 1)
        .setParameter('keywords', keywords)
        .setParameter('relevanceCursor', relevanceCursor)
        .setParameter('firstQuestionId', firstQuestionId)
        .getRawMany() as Promise<{ question_id: number; relevance: number }[]>;
      const [prev, here] = await Promise.all([prevPromise, herePromise]);
      const questionDtos = await Promise.all(
        here.map((questionId) =>
          this.getQuestionDto(
            questionId.question_id,
            searcherId,
            ip,
            userAgent,
          ),
        ),
      );
      const log = this.questionSearchLogRepository.create({
        keywords,
        firstQuestionId,
        pageSize,
        result: here.map((t) => t.question_id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId,
        ip,
        userAgent,
      });
      await this.questionSearchLogRepository.save(log);
      return PageHelper.Page(
        prev,
        questionDtos,
        pageSize,
        (q) => q.question_id,
        (q) => q.id,
      );
    }
  }

  async updateQuestion(
    questionId: number,
    title: string,
    content: string,
    type: number,
    topicIds: number[],
  ): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionNotFoundError(questionId);
    await this.entityManager.transaction(
      async (entityManager: EntityManager) => {
        const questionRepository = entityManager.getRepository(Question);
        question.title = title;
        question.content = content;
        question.type = type;
        await questionRepository.save(question);
        const questionTopicRelationRepository = entityManager.getRepository(
          QuestionTopicRelation,
        );
        await questionTopicRelationRepository.softDelete({ questionId });
        await Promise.all(
          topicIds.map((topicId) =>
            this.addTopicToQuestion(
              question.id,
              topicId,
              question.createdById,
              true,
              questionTopicRelationRepository,
            ),
          ),
        );
      },
    );
  }

  async getQuestionCreatedById(questionId: number): Promise<number> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionNotFoundError(questionId);
    return question.createdById;
  }
}

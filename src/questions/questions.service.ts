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
import { EntityManager, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
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
import {
  QuestionAlreadyFollowedError,
  QuestionIdNotFoundError,
  QuestionNotFollowedYetError,
} from './questions.error';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly userService: UsersService,
    private readonly topicService: TopicsService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
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
      if (question == null) throw new QuestionIdNotFoundError(questionId);
    }
    const topicExists = await this.topicService.isTopicExists(topicId);
    if (topicExists == false) throw new TopicNotFoundError(topicId);
    const createByExists = await this.userService.isUserExists(createdById);
    if (createByExists == false) throw new UserIdNotFoundError(createdById);
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
      const topicExists = await this.topicService.isTopicExists(topicId);
      if (topicExists == false) throw new TopicNotFoundError(topicId);
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
    userId: number | undefined,
    questionId: number,
  ): Promise<boolean> {
    if (userId == undefined) return false;
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
    viewerId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<QuestionDto> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionIdNotFoundError(questionId);
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
    let user: UserDto | null = null!;
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
    if (viewerId != null || ip != null || userAgent != null) {
      const log = this.questionQueryLogRepository.create({
        viewerId,
        questionId,
        ip,
        userAgent,
      });
      await this.questionQueryLogRepository.save(log);
    }
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
      group: null!, // TODO: Implement this.
    };
  }

  async searchQuestions(
    keywords: string,
    firstQuestionId: number | undefined, // if from start
    pageSize: number,
    searcherId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<[QuestionDto[], PageRespondDto]> {
    const timeBegin = Date.now();
    const allQuestionIds = (await this.questionRepository
      .createQueryBuilder('question')
      .select([
        'question.id AS id',
        'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
      ])
      .where(
        'MATCH (question.title, question.content) AGAINST (:keywords IN NATURAL LANGUAGE MODE)',
      )
      .orderBy({ relevance: 'DESC', id: 'ASC' })
      .limit(1000)
      .setParameter('keywords', keywords)
      .getRawMany()) as { id: number }[];
    const [questionIds, page] = PageHelper.PageFromAll(
      allQuestionIds,
      firstQuestionId,
      pageSize,
      (i) => i.id,
      (firstQuestionId) => {
        throw new QuestionIdNotFoundError(firstQuestionId);
      },
    );
    const questions = await Promise.all(
      questionIds.map((questionId) =>
        this.getQuestionDto(questionId.id, searcherId, ip, userAgent),
      ),
    );
    if (searcherId != null || ip != null || userAgent != null) {
      const log = this.questionSearchLogRepository.create({
        keywords,
        firstQuestionId: firstQuestionId,
        pageSize,
        result: questionIds.map((t) => t.id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId,
        ip,
        userAgent,
      });
      await this.questionSearchLogRepository.save(log);
    }
    return [questions, page];
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
    if (question == null) throw new QuestionIdNotFoundError(questionId);
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
    if (question == null) throw new QuestionIdNotFoundError(questionId);
    return question.createdById;
  }

  async deleteQuestion(questionId: number): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionIdNotFoundError(questionId);
    await this.questionRepository.softDelete({ id: questionId });
  }

  async followQuestion(followerId: number, questionId: number): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionIdNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    const relationOld = await this.questionFollowRelationRepository.findOneBy({
      followerId,
      questionId,
    });
    if (relationOld != null) throw new QuestionAlreadyFollowedError(questionId);

    const relation = this.questionFollowRelationRepository.create({
      followerId,
      questionId,
    });
    await this.questionFollowRelationRepository.save(relation);
  }

  async unfollowQuestion(
    followerId: number,
    questionId: number,
  ): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == null) throw new QuestionIdNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    const relation = await this.questionFollowRelationRepository.findOneBy({
      followerId,
      questionId,
    });
    if (relation == null) throw new QuestionNotFollowedYetError(questionId);
    await this.questionFollowRelationRepository.softDelete({
      followerId,
      questionId,
    });
  }

  async getQuestionFollowers(
    questionId: number,
    firstFollowerId: number | undefined, // if from start
    pageSize: number,
    viewerId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<[UserDto[], PageRespondDto]> {
    if (firstFollowerId == null) {
      const relations = await this.questionFollowRelationRepository.find({
        where: { questionId },
        take: pageSize + 1,
        order: { followerId: 'ASC' },
      });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.userService.getUserDtoById(
            r.followerId,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevRelationshipsPromise =
        this.questionFollowRelationRepository.find({
          where: {
            questionId,
            followerId: LessThan(firstFollowerId),
          },
          take: pageSize,
          order: { followerId: 'DESC' },
        });
      const queriedRelationsPromise =
        this.questionFollowRelationRepository.find({
          where: {
            questionId,
            followerId: MoreThanOrEqual(firstFollowerId),
          },
          take: pageSize + 1,
          order: { followerId: 'ASC' },
        });
      const DTOs = await Promise.all(
        (await queriedRelationsPromise).map((r) => {
          return this.userService.getUserDtoById(
            r.followerId,
            viewerId,
            ip,
            userAgent,
          );
        }),
      );
      const prev = await prevRelationshipsPromise;
      return PageHelper.PageMiddle(
        prev,
        DTOs,
        pageSize,
        (i) => i.followerId,
        (i) => i.id,
      );
    }
  }
}

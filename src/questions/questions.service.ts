/*
 *  Description: This file implements the QuestionsService class.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { TopicDto } from '../topics/DTO/topic.dto';
import { TopicNotFoundError } from '../topics/topics.error';
import { TopicsService } from '../topics/topics.service';
import { UserDto } from '../users/DTO/user.dto';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { QuestionInvitationDetailDto } from './DTO/get-invitation-detail.dto';
import { QuestionInvitationDto } from './DTO/get-question-invitation.dto';
import { GetRecommentdations } from './DTO/get-recommendations.dto';
import { InviteUsersAnswerDto } from './DTO/invite-user-answer.dto';
import { QuestionDto } from './DTO/question.dto';
import {
  AlreadyAnsweredError,
  AlreadyInvitedError,
  QuestionAlreadyFollowedError,
  QuestionIdNotFoundError,
  QuestionInvitationIdNotFoundError,
  QuestionNotFollowedYetError,
  QuestionNotHasThisTopicError,
} from './questions.error';
import { QuestionElasticsearchDocument } from './questions.es-doc';
import {
  Question,
  QuestionFollowerRelation,
  QuestionQueryLog,
  QuestionSearchLog,
  QuestionTopicRelation,
} from './questions.legacy.entity';

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
    private readonly elasticSearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
  ) {}

  async addTopicToQuestion(
    questionId: number,
    topicId: number,
    createdById: number,
    // for transaction
    omitQuestionExistsCheck: boolean = false,
    questionTopicRelationRepository?: Repository<QuestionTopicRelation>,
  ): Promise<void> {
    if (questionTopicRelationRepository == undefined)
      questionTopicRelationRepository = this.questionTopicRelationRepository;
    if (omitQuestionExistsCheck == false) {
      const question = await this.questionRepository.findOneBy({
        id: questionId,
      });
      if (question == undefined) throw new QuestionIdNotFoundError(questionId);
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

  async deleteTopicFromQuestion(
    questionId: number,
    topicId: number,
    // for transaction
    questionTopicRelationRepository?: Repository<QuestionTopicRelation>,
  ): Promise<void> {
    if (questionTopicRelationRepository == undefined)
      questionTopicRelationRepository = this.questionTopicRelationRepository;
    const relation = await questionTopicRelationRepository.findOneBy({
      questionId,
      topicId,
    });
    if (relation == null)
      throw new QuestionNotHasThisTopicError(questionId, topicId);
    await questionTopicRelationRepository.softDelete({ id: relation.id });
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
    let question: Question;
    await this.entityManager.transaction(
      async (entityManager: EntityManager) => {
        const questionRepository = entityManager.getRepository(Question);
        question = questionRepository.create({
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
      },
    );
    if (question! == undefined)
      throw new Error(
        "Impossible: variable 'question' is undefined after transaction.",
      );
    const esIndexResult =
      await this.elasticSearchService.index<QuestionElasticsearchDocument>({
        index: 'questions',
        document: {
          id: question.id,
          title: question.title,
          content: question.content,
        },
      });
    await this.prismaService.questionElasticsearchRelation.create({
      data: {
        elasticsearchId: esIndexResult._id,
        question: { connect: { id: question.id } },
      },
    });
    return question.id;
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
    return relation != undefined;
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
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
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
    let user: UserDto = undefined!; // For case that user is deleted.
    try {
      user = await this.userService.getUserDtoById(
        question.createdById,
        viewerId,
        ip,
        userAgent,
      );
    } catch (e) {
      // If user is undefined, it means that one user created this question, but the user
      // does not exist now. This is NOT a data integrity problem, since user can be
      // deleted. So we just return a undefined and not throw an error.
    }
    if (viewerId != undefined || ip != undefined || userAgent != undefined) {
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
      author: user,
      type: question.type,
      topics,
      created_at: question.createdAt.getTime(),
      updated_at: question.updatedAt.getTime(),
      is_follow: hasFollowed,
      is_like: false, // TODO: Implement this.
      is_answered: false, //TODO: Implement this
      my_answer_id: 0, //TODO: Implement this
      answer_count: 0, // TODO: Implement this.
      comment_count: 0, // TODO: Implement this.
      follow_count: followCount,
      like_count: 0, // TODO: Implement this.
      view_count: viewCount,
      is_group: question.groupId != undefined,
      group: undefined!, // TODO: Implement this.
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
    const result = !keywords
      ? { hits: { hits: [] } }
      : await this.elasticSearchService.search<QuestionElasticsearchDocument>({
          index: 'questions',
          size: 1000,
          body: {
            query: {
              multi_match: {
                query: keywords,
                fields: ['title', 'content'],
              },
            },
          },
        });
    const allQuestionEsDocs = result.hits.hits
      .filter((h) => h._source != undefined)
      .map((h) => h._source) as QuestionElasticsearchDocument[];
    const [questionEsDocs, page] = PageHelper.PageFromAll(
      allQuestionEsDocs,
      firstQuestionId,
      pageSize,
      (i) => i.id,
      (firstQuestionId) => {
        throw new QuestionIdNotFoundError(firstQuestionId);
      },
    );
    const questions = await Promise.all(
      questionEsDocs.map((questionId) =>
        this.getQuestionDto(questionId.id, searcherId, ip, userAgent),
      ),
    );
    const log = this.questionSearchLogRepository.create({
      keywords,
      firstQuestionId: firstQuestionId,
      pageSize,
      result: questionEsDocs.map((t) => t.id).join(','),
      duration: (Date.now() - timeBegin) / 1000,
      searcherId,
      ip,
      userAgent,
    });
    await this.questionSearchLogRepository.save(log);
    return [questions, page];
  }

  async updateQuestion(
    questionId: number,
    title: string,
    content: string,
    type: number,
    topicIds: number[],
    updateById: number,
  ): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
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
        const oldTopicIds = (
          await questionTopicRelationRepository.findBy({ questionId })
        ).map((r) => r.topicId);
        const toDelete = oldTopicIds.filter((id) => !topicIds.includes(id));
        const toAdd = topicIds.filter((id) => !oldTopicIds.includes(id));
        await Promise.all(
          toDelete.map((id) => this.deleteTopicFromQuestion(questionId, id)),
        );
        await Promise.all(
          toAdd.map((id) =>
            this.addTopicToQuestion(
              questionId,
              id,
              updateById,
              true,
              questionTopicRelationRepository,
            ),
          ),
        );
        const esRelation =
          await this.prismaService.questionElasticsearchRelation.findUnique({
            where: { questionId },
          });
        if (esRelation == null)
          throw new Error(
            `Question with id ${questionId} exists, ` +
              `but there is no record of its elaticsearch id. ` +
              `This is impossible if the program works well. ` +
              `It might be caused by a bug, a database migration problem, ` +
              `or that the database has corrupted.`,
          );
        const questionEsDocNew: QuestionElasticsearchDocument = {
          id: questionId,
          title: title,
          content: content,
        };
        await this.elasticSearchService.update<QuestionElasticsearchDocument>({
          index: 'questions',
          id: esRelation.elasticsearchId,
          doc: questionEsDocNew,
        });
      },
    );
  }

  async getQuestionCreatedById(questionId: number): Promise<number> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
    return question.createdById;
  }

  async deleteQuestion(questionId: number): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
    const esRelation =
      await this.prismaService.questionElasticsearchRelation.findUnique({
        where: { questionId },
      });
    if (esRelation == null)
      throw new Error(
        `Question with id ${questionId} exists, ` +
          `but there is no record of its elaticsearch id. ` +
          `This is impossible if the program works well. ` +
          `It might be caused by a bug, a database migration problem, ` +
          `or that the database has corrupted.`,
      );
    await this.elasticSearchService.delete({
      index: 'questions',
      id: esRelation.elasticsearchId,
    });
    await this.prismaService.questionElasticsearchRelation.delete({
      where: { questionId },
    });
    await this.questionRepository.softDelete({ id: questionId });
  }

  async followQuestion(followerId: number, questionId: number): Promise<void> {
    const question = await this.questionRepository.findOneBy({
      id: questionId,
    });
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    const relationOld = await this.questionFollowRelationRepository.findOneBy({
      followerId,
      questionId,
    });
    if (relationOld != undefined)
      throw new QuestionAlreadyFollowedError(questionId);

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
    if (question == undefined) throw new QuestionIdNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    const relation = await this.questionFollowRelationRepository.findOneBy({
      followerId,
      questionId,
    });
    if (relation == undefined)
      throw new QuestionNotFollowedYetError(questionId);
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
    if (firstFollowerId == undefined) {
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
  async inviteUsersToAnswerQuestion(
    questionId: number,
    userId: number,
  ): Promise<InviteUsersAnswerDto> {
    const questionDto = await this.getQuestionDto(questionId);
    const userdto = await this.userService.getUserDtoById(userId);
    const haveBeenInvited =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: {
          questionId: questionId,
          userId: userId,
        },
      });

    if (haveBeenInvited) {
      if (questionDto.is_answered) {
        throw new AlreadyAnsweredError(userId);
      } else {
        throw new AlreadyInvitedError(userId);
      }
    }
    const Invitation =
      await this.prismaService.questionInvitationRelation.create({
        data: {
          questionId,
          userId,
        },
      });
    return {
      userId,
      invitationId: Invitation.id,
    };
  }

  async getQuestionInvitations(
    questionId: number,
    sort: '+createdAt' | '-createdAt',
    pageSize: number,
    pageStart: number,
  ): Promise<{
    Invitations: QuestionInvitationDto[];
    page_start: number;
    has_prev: boolean;
    has_more: boolean;
  }> {
    const orderField = sort === '+createdAt' ? 'asc' : 'desc';
    const questionDto = await this.getQuestionDto(questionId);
    const questionInvitations =
      await this.prismaService.questionInvitationRelation.findMany({
        where: { questionId },
        orderBy: { createdAt: orderField },
        take: pageSize,
        skip: pageStart,
      });

    const totalCount = questionInvitations.length;

    const currentPage = Math.floor(pageStart / pageSize) + 1;
    const hasPrev = currentPage > 1;
    const hasNext = totalCount > currentPage * pageSize;
    return Promise.all(
      questionInvitations.map(async (invitation) => {
        const user = await this.userService.getUserDtoById(invitation.userId);
        return {
          id: invitation.id,
          questionId: invitation.questionId,
          user,
          createAt: invitation.createdAt,
          updateAt: invitation.updatedAt,
          isAnswered: questionDto.is_answered,
        };
      }),
    ).then((invitations) => {
      return {
        Invitations: invitations,
        page_start: pageStart,
        has_prev: hasPrev,
        has_more: hasNext,
      };
    });
  }
  async getQuestionInvitationRecommendations(
    questionId: number,
    pageSize = 5,
  ): Promise<GetRecommentdations> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new QuestionIdNotFoundError(questionId);
    }
    const randomUserEntities = await this.prismaService.user.findMany({
      take: pageSize,
      orderBy: {
        id: 'asc',
      }, //TODO
    });
    const userDtos = await Promise.all(
      randomUserEntities.map((entity) =>
        this.userService.getUserDtoById(entity.id),
      ),
    );

    return {
      users: userDtos,
    };
  }
  async getInvitationDetail(
    questionId: number,
    invitationId: number,
  ): Promise<QuestionInvitationDetailDto> {
    const questionDto = await this.getQuestionDto(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: { id: invitationId, questionId },
      });
    if (!invitation) {
      throw new QuestionInvitationIdNotFoundError(invitationId);
    }
    const userdto = await this.userService.getUserDtoById(invitation.userId);
    return {
      id: invitation.id,
      questionId: invitation.questionId,
      user: userdto,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      isAnswered: questionDto.is_answered,
    };
  }

  async cancelInvitation(
    questionId: number,
    invitationId: number,
  ): Promise<void> {
    const questiondto = await this.getQuestionDto(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: { id: invitationId, questionId },
      });
    if (!invitation) {
      throw new QuestionInvitationIdNotFoundError(invitationId);
    }
    await this.prismaService.questionInvitationRelation.delete({
      where: {
        id: invitationId,
      },
    });
  }

  async isQuestionExists(questionId: number): Promise<boolean> {
    return (await this.questionRepository.countBy({ id: questionId })) > 0;
  }
}

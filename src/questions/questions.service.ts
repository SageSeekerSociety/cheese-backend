/*
 *  Description: This file implements the QuestionsService class.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  AttitudableType,
  AttitudeType,
  QuestionInvitationRelation,
} from '@prisma/client';
import { EntityManager, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { AnswerNotFoundError } from '../answer/answer.error';
import { AnswerService } from '../answer/answer.service';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { CommentableType } from '../comments/commentable.enum';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import {
  getCurrWhereBySort,
  getPrevWhereBySort,
} from '../common/helper/where.helper';
import { SortPattern } from '../common/pipe/parse-sort-pattern.pipe';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { TopicDto } from '../topics/DTO/topic.dto';
import { TopicNotFoundError } from '../topics/topics.error';
import { TopicsService } from '../topics/topics.service';
import { UserDto } from '../users/DTO/user.dto';
import { UserIdNotFoundError } from '../users/users.error';
import { User } from '../users/users.legacy.entity';
import { UsersService } from '../users/users.service';
import { QuestionInvitationDto } from './DTO/question-invitation.dto';
import { QuestionDto } from './DTO/question.dto';
import {
  AlreadyAnsweredError,
  BOUNTY_LIMIT,
  BountyNotBiggerError,
  BountyOutOfLimitError,
  QuestionAlreadyFollowedError,
  QuestionIdNotFoundError,
  QuestionInvitationIdNotFoundError,
  QuestionNotFollowedYetError,
  QuestionNotHasThisTopicError,
  UserAlreadyInvitedError,
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
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly topicService: TopicsService,
    @Inject(forwardRef(() => AttitudeService))
    private readonly attitudeService: AttitudeService,
    @Inject(forwardRef(() => GroupsService))
    private readonly groupService: GroupsService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
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
    await questionTopicRelationRepository.softRemove({ id: relation.id });
  }

  // returns: question id
  async addQuestion(
    askerUserId: number,
    title: string,
    content: string,
    type: number,
    topicIds: number[],
    groupId?: number,
    bounty: number = 0,
  ): Promise<number> {
    if (bounty < 0 || bounty > BOUNTY_LIMIT)
      throw new BountyOutOfLimitError(bounty);

    for (const topicId of topicIds) {
      const topicExists = await this.topicService.isTopicExists(topicId);
      if (topicExists == false) throw new TopicNotFoundError(topicId);
    }

    // const nonExistTopicId = topicIds.find(async (topicId) => {
    //   const exist = await this.topicService.isTopicExists(topicId);
    //   return !exist;
    // });
    // if (nonExistTopicId) throw new TopicNotFoundError(nonExistTopicId);

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
          bounty,
          bountyStartAt: bounty ? new Date() : undefined,
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
    viewerId?: number,
    ip?: string,
    userAgent?: string,
  ): Promise<QuestionDto> {
    const question = await this.prismaService.question.findUnique({
      where: { id: questionId },
      include: { acceptedAnswer: true },
    });
    if (question == undefined || question.deletedAt)
      //! workaround before soft delete middleware
      throw new QuestionIdNotFoundError(questionId);

    let userDto: UserDto | null = null; // For case that user is deleted.
    try {
      userDto = await this.userService.getUserDtoById(
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
    const topicsPromise = this.getTopicDtosOfQuestion(questionId);
    const hasFollowedPromise = this.hasFollowedQuestion(viewerId, questionId);
    const followCountPromise = this.getFollowCountOfQuestion(questionId);
    const viewCountPromise = this.getViewCountOfQuestion(questionId);
    const myAnswerIdPromise =
      viewerId == undefined
        ? Promise.resolve(undefined) // If the viewer is not logged in, then the field should be missing.
        : this.answerService.getAnswerIdOfCreatedBy(questionId, viewerId); // If the viewer is logged in, then the field should be a number or null.
    const attitudeDtoPromise = this.attitudeService.getAttitudeStatusDto(
      AttitudableType.QUESTION,
      questionId,
      viewerId,
    );
    const answerCountPromise = this.prismaService.answer.count({
      where: {
        deletedAt: null,
        questionId,
      },
    });
    const commentCountPromise = this.prismaService.comment.count({
      where: {
        deletedAt: null,
        commentableType: CommentableType.QUESTION,
        commentableId: questionId,
      },
    });
    const groupDtoPromise =
      question.groupId == undefined
        ? Promise.resolve(null)
        : this.groupService.getGroupDtoById(undefined, question.groupId);
    const acceptedAnswerDtoPromise =
      question.acceptedAnswer == undefined
        ? Promise.resolve(null)
        : this.answerService.getAnswerDto(
            questionId,
            question.acceptedAnswer.id,
            viewerId,
            ip,
            userAgent,
          );

    const [
      topics,
      hasFollowed,
      followCount,
      viewCount,
      myAnswerId,
      attitudeDto,
      answerCount,
      commentCount,
      groupDto,
      acceptedAnswerDto,
    ] = await Promise.all([
      topicsPromise,
      hasFollowedPromise,
      followCountPromise,
      viewCountPromise,
      myAnswerIdPromise,
      attitudeDtoPromise,
      answerCountPromise,
      commentCountPromise,
      groupDtoPromise,
      acceptedAnswerDtoPromise,
    ]);
    if (viewerId != undefined && ip != undefined) {
      // TODO: is checking all fields necessary? This is only a temporary solution to meet the not-null constraint.
      // TODO: userAgent maybe null when testing
      const log = this.questionQueryLogRepository.create({
        viewerId,
        questionId,
        ip,
        userAgent: userAgent ?? '',
      });
      await this.questionQueryLogRepository.save(log);
    }
    return {
      id: question.id,
      title: question.title,
      content: question.content,
      author: userDto,
      type: question.type,
      topics,
      created_at: question.createdAt.getTime(),
      updated_at: question.updatedAt.getTime(),
      is_follow: hasFollowed,
      my_answer_id: myAnswerId,
      answer_count: answerCount,
      comment_count: commentCount,
      follow_count: followCount,
      attitudes: attitudeDto,
      view_count: viewCount,
      group: groupDto,
      bounty: question.bounty,
      bounty_start_at: question.bountyStartAt?.getTime(),
      accepted_answer: acceptedAnswerDto,
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

  async getFollowedQuestions(
    followerId: number,
    firstQuestionId: number | undefined, // if from start
    pageSize: number,
    viewerId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<[QuestionDto[], PageRespondDto]> {
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);
    if (firstQuestionId == undefined) {
      const relations = await this.questionFollowRelationRepository.find({
        where: { followerId },
        take: pageSize + 1,
        order: { questionId: 'ASC' },
      });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getQuestionDto(r.questionId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevPromise = this.questionFollowRelationRepository.find({
        where: {
          followerId,
          questionId: LessThan(firstQuestionId),
        },
        take: pageSize,
        order: { questionId: 'DESC' },
      });
      const currPromise = this.questionFollowRelationRepository.find({
        where: {
          followerId,
          questionId: MoreThanOrEqual(firstQuestionId),
        },
        take: pageSize + 1,
        order: { questionId: 'ASC' },
      });
      const [prev, curr] = await Promise.all([prevPromise, currPromise]);
      const currDTOs = await Promise.all(
        curr.map((record) =>
          this.getQuestionDto(record.questionId, viewerId, ip, userAgent),
        ),
      );
      return PageHelper.PageMiddle(
        prev,
        currDTOs,
        pageSize,
        (i) => i.questionId,
        (i) => i.id,
      );
    }
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

  // returns:
  //    invitation id
  async inviteUsersToAnswerQuestion(
    questionId: number,
    userId: number,
  ): Promise<number> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    if ((await this.userService.isUserExists(userId)) == false)
      throw new UserIdNotFoundError(userId);
    const haveBeenAnswered = await this.answerService.getAnswerIdOfCreatedBy(
      questionId,
      userId,
    );
    if (haveBeenAnswered) {
      throw new AlreadyAnsweredError(userId);
    }
    const haveBeenInvited =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: {
          questionId: questionId,
          userId: userId,
        },
      });
    if (haveBeenInvited) {
      throw new UserAlreadyInvitedError(userId);
    }

    const invitation =
      await this.prismaService.questionInvitationRelation.create({
        data: {
          questionId,
          userId,
        },
      });
    return invitation.id;
  }

  async getQuestionInvitations(
    questionId: number,
    sort: SortPattern,
    pageStart: number | undefined,
    pageSize: number | undefined = 20,
  ): Promise<[QuestionInvitationDto[], PageRespondDto]> {
    const record2dto = async (
      invitation: QuestionInvitationRelation,
    ): Promise<QuestionInvitationDto> => {
      return {
        id: invitation.id,
        question_id: invitation.questionId,
        user: await this.userService.getUserDtoById(invitation.userId),
        created_at: invitation.createdAt.getTime(),
        updated_at: invitation.updatedAt.getTime(),
        is_answered: await this.isQuestionAnsweredBy(
          questionId,
          invitation.userId,
        ),
      };
    };

    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    if (pageStart == undefined) {
      const invitations =
        await this.prismaService.questionInvitationRelation.findMany({
          where: { questionId },
          orderBy: sort,
          take: pageSize + 1,
        });
      const invitationDtos: QuestionInvitationDto[] = await Promise.all(
        invitations.map(record2dto),
      );
      return PageHelper.PageStart(invitationDtos, pageSize, (i) => i.id);
    } else {
      const cursor =
        await this.prismaService.questionInvitationRelation.findUnique({
          where: { id: pageStart },
        });
      if (cursor == undefined)
        throw new QuestionInvitationIdNotFoundError(pageStart);
      const prev = await this.prismaService.questionInvitationRelation.findMany(
        {
          where: {
            questionId,
            ...getPrevWhereBySort(sort, cursor),
          },
          orderBy: sort,
          take: pageSize,
        },
      );
      const curr = await this.prismaService.questionInvitationRelation.findMany(
        {
          where: {
            questionId,
            ...getCurrWhereBySort(sort, cursor),
          },
          orderBy: sort,
          take: pageSize + 1,
        },
      );
      const currDtos = await Promise.all(curr.map(record2dto));
      return PageHelper.PageMiddle(
        prev,
        currDtos,
        pageSize,
        (i) => i.id,
        (i) => i.id,
      );
    }
  }

  async getQuestionInvitationRecommendations(
    questionId: number,
    pageSize = 5,
  ): Promise<UserDto[]> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new QuestionIdNotFoundError(questionId);
    }
    // No sql injection here:
    // "The method is implemented as a tagged template, which allows you to pass a template literal where you can easily
    // insert your variables. In turn, Prisma Client creates prepared statements that are safe from SQL injections."
    // See: https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries
    const randomUserEntities = await this.prismaService.$queryRaw<User[]>`
      SELECT * FROM "user" WHERE id NOT IN (
        SELECT "user_id" FROM question_invitation_relation
        WHERE "question_id" = ${questionId}
      )
      ORDER BY RANDOM()
      LIMIT ${pageSize}
    `;
    // const randomUserEntities = await this.prismaService.user.findMany({
    //   take: pageSize,
    //   orderBy: {
    //     id: 'asc',
    //   }, //TODO
    //   where: {
    //     NOT: {
    //       QuestionInvitationRelation: {
    //         some: {
    //           questionId,
    //         },
    //       }
    //     }
    //   }
    // });

    const userDtos = await Promise.all(
      randomUserEntities.map((entity) =>
        this.userService.getUserDtoById(entity.id),
      ),
    );

    return userDtos;
  }
  async getQuestionInvitationDto(
    questionId: number,
    invitationId: number,
  ): Promise<QuestionInvitationDto> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
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
      question_id: invitation.questionId,
      user: userdto,
      created_at: invitation.createdAt.getTime(),
      updated_at: invitation.updatedAt.getTime(),
      is_answered: await this.isQuestionAnsweredBy(
        questionId,
        invitation.userId,
      ),
    };
  }

  async cancelInvitation(
    questionId: number,
    invitationId: number,
  ): Promise<void> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
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

  async setAttitudeToQuestion(
    questionId: number,
    userId: number,
    attitudeType: AttitudeType,
  ): Promise<AttitudeStateDto> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    await this.attitudeService.setAttitude(
      userId,
      AttitudableType.QUESTION,
      questionId,
      attitudeType,
    );
    return this.attitudeService.getAttitudeStatusDto(
      AttitudableType.QUESTION,
      questionId,
      userId,
    );
  }

  async isQuestionAnsweredBy(
    questionId: number,
    userId: number | undefined,
  ): Promise<boolean> {
    if (userId == undefined) return false;
    return (
      (await this.answerService.getAnswerIdOfCreatedBy(questionId, userId)) !=
      undefined
    );
  }

  async getInvitedById(
    questionId: number,
    invitationId: number,
  ): Promise<number> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findUnique({
        where: {
          questionId,
          id: invitationId,
        },
      });
    if (invitation == undefined)
      throw new QuestionInvitationIdNotFoundError(invitationId);
    return invitation.userId;
  }

  async setBounty(questionId: number, bounty: number) {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    if (bounty < 0 || bounty > BOUNTY_LIMIT)
      throw new BountyOutOfLimitError(bounty);

    const oldBounty = (
      await this.prismaService.question.findUniqueOrThrow({
        where: { id: questionId },
      })
    ).bounty;
    if (!(bounty > oldBounty)) {
      throw new BountyNotBiggerError(questionId, bounty);
    }

    await this.prismaService.question.update({
      where: { id: questionId },
      data: {
        bounty,
        bountyStartAt: new Date(),
      },
    });
  }

  async acceptAnswer(questionId: number, answerId: number): Promise<void> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionIdNotFoundError(questionId);
    if (
      (await this.answerService.isAnswerExists(questionId, answerId)) == false
    )
      throw new AnswerNotFoundError(answerId);

    await this.prismaService.question.update({
      where: { id: questionId },
      data: {
        acceptedAnswer: {
          connect: {
            id: answerId,
          },
        },
      },
    });
  }

  async getQuestionCount(userId: number): Promise<number> {
    return await this.questionRepository.countBy({ createdById: userId });
  }

  async getUserAskedQuestions(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId?: number,
    userAgent?: string,
    ip?: string,
  ): Promise<[QuestionDto[], PageRespondDto]> {
    if ((await this.userService.isUserExists(userId)) == false)
      throw new UserIdNotFoundError(userId);
    if (!pageStart) {
      const currPage = await this.questionRepository.find({
        where: { createdById: userId },
        order: { id: 'ASC' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getQuestionDto(entity.id, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(currDto, pageSize, (answer) => answer.id);
    } else {
      const prevPage = await this.questionRepository.find({
        where: {
          createdById: userId,
          id: LessThan(pageStart),
        },
        order: { id: 'DESC' },
        take: pageSize,
      });
      const currPage = await this.questionRepository.find({
        where: {
          createdById: userId,
          id: MoreThanOrEqual(pageStart),
        },
        order: { id: 'ASC' },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getQuestionDto(entity.id, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageMiddle(
        prevPage,
        currDto,
        pageSize,
        (answer) => answer.id,
        (answer) => answer.id,
      );
    }
  }
}

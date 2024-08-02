/*
 *  Description: This file implements the QuestionsService class.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *      Andy Lee        <andylizf@outlook.com>
 *      HuanCheng65
 *
 */

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  AttitudableType,
  AttitudeType,
  CommentCommentabletypeEnum,
  PrismaClient,
  Question,
  QuestionInvitationRelation,
  User,
} from '@prisma/client';
import { AnswerNotFoundError } from '../answer/answer.error';
import { AnswerService } from '../answer/answer.service';
import { AttitudeStateDto } from '../attitude/DTO/attitude-state.dto';
import { AttitudeService } from '../attitude/attitude.service';
import { PageDto } from '../common/DTO/page-response.dto';
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
import { UsersService } from '../users/users.service';
import { QuestionInvitationDto } from './DTO/question-invitation.dto';
import { QuestionDto } from './DTO/question.dto';
import {
  AlreadyAnsweredError,
  BOUNTY_LIMIT,
  BountyNotBiggerError,
  BountyOutOfLimitError,
  QuestionAlreadyFollowedError,
  QuestionInvitationNotFoundError,
  QuestionNotFollowedYetError,
  QuestionNotFoundError,
  QuestionNotHasThisTopicError,
  UserAlreadyInvitedError,
} from './questions.error';
import { QuestionElasticsearchDocument } from './questions.es-doc';

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
    private readonly elasticSearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
  ) {}

  async addTopicToQuestion(
    questionId: number,
    topicId: number,
    createdById: number,
    // for transaction
    omitQuestionExistsCheck: boolean = false,
    prismaClient: PrismaClient | undefined = this.prismaService,
  ): Promise<void> {
    if (
      !omitQuestionExistsCheck &&
      (await this.isQuestionExists(questionId)) == false
    )
      throw new QuestionNotFoundError(questionId);
    if ((await this.topicService.isTopicExists(topicId)) == false)
      throw new TopicNotFoundError(topicId);
    if ((await this.userService.isUserExists(createdById)) == false)
      throw new UserIdNotFoundError(createdById);
    await prismaClient.questionTopicRelation.create({
      data: {
        questionId,
        topicId,
        createdById,
        createdAt: new Date(),
      },
    });
  }

  async deleteTopicFromQuestion(
    questionId: number,
    topicId: number,
    // for transaction
    prismaClient: PrismaClient | undefined = this.prismaService,
  ): Promise<void> {
    const ret = await prismaClient.questionTopicRelation.updateMany({
      where: {
        topicId,
        questionId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    if (ret.count == 0)
      throw new QuestionNotHasThisTopicError(questionId, topicId);
    /* istanbul ignore if */
    if (ret.count > 1)
      Logger.error(
        `More than one question-topic relation deleted. questionId: ${questionId}, topicId: ${topicId}`,
      );
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
    /* istanbul ignore if */
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
    await this.prismaService.$transaction(
      async (prismaClient) => {
        question = await prismaClient.question.create({
          data: {
            createdById: askerUserId,
            title,
            content,
            type,
            groupId,
            bounty,
            bountyStartAt: bounty ? new Date() : undefined,
            createdAt: new Date(),
          },
        });
        for (const topicId of topicIds) {
          await this.addTopicToQuestion(
            question.id,
            topicId,
            askerUserId,
            true,
            prismaClient as PrismaClient, // for transaction
          );
        }
      },
      { maxWait: 60000, timeout: 60000 },
    );

    /* istanbul ignore if */
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
    return (
      (await this.prismaService.questionFollowerRelation.count({
        where: {
          followerId: userId,
          questionId,
        },
      })) > 0
    );
  }

  // returns: a list of topicId
  async getTopicDtosOfQuestion(
    questionId: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<TopicDto[]> {
    const relations = await this.prismaService.questionTopicRelation.findMany({
      where: {
        questionId,
      },
    });
    return await Promise.all(
      relations.map((relation) =>
        this.topicService.getTopicDtoById(
          relation.topicId,
          viewerId,
          ip,
          userAgent,
        ),
      ),
    );
  }

  async getFollowCountOfQuestion(questionId: number): Promise<number> {
    return await this.prismaService.questionFollowerRelation.count({
      where: {
        questionId,
      },
    });
  }

  async getViewCountOfQuestion(questionId: number): Promise<number> {
    return await this.prismaService.questionQueryLog.count({
      where: {
        questionId,
      },
    });
  }

  async getQuestionDto(
    questionId: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<QuestionDto> {
    const question = await this.prismaService.question.findUnique({
      where: {
        id: questionId,
      },
      include: { acceptedAnswer: true },
    });
    if (question == undefined) throw new QuestionNotFoundError(questionId);

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
    const topicsPromise = this.getTopicDtosOfQuestion(
      questionId,
      viewerId,
      ip,
      userAgent,
    );
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
        questionId,
      },
    });
    const commentCountPromise = this.prismaService.comment.count({
      where: {
        commentableType: CommentCommentabletypeEnum.QUESTION,
        commentableId: questionId,
      },
    });
    const groupDtoPromise =
      question.groupId == undefined
        ? Promise.resolve(null)
        : this.groupService.getGroupDtoById(
            undefined,
            question.groupId,
            ip,
            userAgent,
          );
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
      await this.prismaService.questionQueryLog.create({
        data: {
          viewerId,
          questionId,
          ip,
          userAgent: userAgent ?? '',
          createdAt: new Date(),
        },
      });
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
    searcherId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[QuestionDto[], PageDto]> {
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
        throw new QuestionNotFoundError(firstQuestionId);
      },
    );
    const questions = await Promise.all(
      questionEsDocs.map((questionId) =>
        this.getQuestionDto(questionId.id, searcherId, ip, userAgent),
      ),
    );
    await this.prismaService.questionSearchLog.create({
      data: {
        keywords,
        firstQuestionId: firstQuestionId,
        pageSize,
        result: questionEsDocs.map((t) => t.id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId,
        ip,
        userAgent: userAgent ?? '',
        createdAt: new Date(),
      },
    });
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
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    await this.prismaService.$transaction(
      async (prismaClient) => {
        // const questionRepository = entityManager.getRepository(Question);
        // question.title = title;
        // question.content = content;
        // question.type = type;
        // await questionRepository.save(question);
        await prismaClient.question.update({
          where: {
            id: questionId,
          },
          data: {
            title,
            content,
            type,
          },
        });
        const oldTopicIds = (
          await prismaClient.questionTopicRelation.findMany({
            where: {
              questionId,
            },
          })
        ).map((r) => r.topicId);
        const toDelete = oldTopicIds.filter((id) => !topicIds.includes(id));
        const toAdd = topicIds.filter((id) => !oldTopicIds.includes(id));
        for (const id of toDelete) {
          await this.deleteTopicFromQuestion(
            questionId,
            id,
            prismaClient as PrismaClient,
          );
        }
        for (const id of toAdd) {
          await this.addTopicToQuestion(
            questionId,
            id,
            updateById,
            false,
            prismaClient as PrismaClient,
          );
        }
        const esRelation =
          await this.prismaService.questionElasticsearchRelation.findUnique({
            where: { questionId },
          });

        /* istanbul ignore if */
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
      { maxWait: 60000, timeout: 60000 },
    );
  }

  async getQuestionCreatedById(questionId: number): Promise<number> {
    const question = await this.prismaService.question.findUnique({
      where: {
        id: questionId,
      },
    });
    if (question == undefined) throw new QuestionNotFoundError(questionId);
    return question.createdById;
  }

  async deleteQuestion(questionId: number): Promise<void> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    const esRelation =
      await this.prismaService.questionElasticsearchRelation.findUnique({
        where: { questionId },
      });

    /* istanbul ignore if */
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
    // await this.questionRepository.softDelete({ id: questionId });
    await this.prismaService.question.update({
      where: { id: questionId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async followQuestion(followerId: number, questionId: number): Promise<void> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    if (
      (await this.prismaService.questionFollowerRelation.count({
        where: {
          followerId,
          questionId,
        },
      })) > 0
    )
      throw new QuestionAlreadyFollowedError(questionId);

    await this.prismaService.questionFollowerRelation.create({
      data: {
        followerId,
        questionId,
        createdAt: new Date(),
      },
    });
  }

  async unfollowQuestion(
    followerId: number,
    questionId: number,
  ): Promise<void> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);

    if (
      (await this.prismaService.questionFollowerRelation.count({
        where: {
          followerId,
          questionId,
        },
      })) == 0
    )
      throw new QuestionNotFollowedYetError(questionId);
    const ret = await this.prismaService.questionFollowerRelation.updateMany({
      where: {
        followerId,
        questionId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    /* istanbul ignore if */
    if (ret.count == 0) throw new QuestionNotFollowedYetError(questionId);
    /* istanbul ignore if */
    if (ret.count > 1)
      throw new Error(
        `More than one question-follower relation deleted. followerId: ${followerId}, questionId: ${questionId}`,
      );
  }

  async getFollowedQuestions(
    followerId: number,
    firstQuestionId: number | undefined, // if from start
    pageSize: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[QuestionDto[], PageDto]> {
    if ((await this.userService.isUserExists(followerId)) == false)
      throw new UserIdNotFoundError(followerId);
    if (firstQuestionId == undefined) {
      const relations =
        await this.prismaService.questionFollowerRelation.findMany({
          where: {
            followerId,
          },
          take: pageSize + 1,
          orderBy: {
            questionId: 'asc',
          },
        });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getQuestionDto(r.questionId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevPromise = this.prismaService.questionFollowerRelation.findMany({
        where: {
          followerId,
          questionId: {
            lt: firstQuestionId,
          },
        },
        take: pageSize,
        orderBy: {
          questionId: 'desc',
        },
      });
      const currPromise = this.prismaService.questionFollowerRelation.findMany({
        where: {
          followerId,
          questionId: {
            gte: firstQuestionId,
          },
        },
        take: pageSize + 1,
        orderBy: {
          questionId: 'asc',
        },
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
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[UserDto[], PageDto]> {
    if (firstFollowerId == undefined) {
      const relations =
        await this.prismaService.questionFollowerRelation.findMany({
          where: {
            questionId,
          },
          take: pageSize + 1,
          orderBy: {
            followerId: 'asc',
          },
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
        this.prismaService.questionFollowerRelation.findMany({
          where: {
            questionId,
            followerId: {
              lt: firstFollowerId,
            },
          },
          take: pageSize,
          orderBy: {
            followerId: 'desc',
          },
        });
      const queriedRelationsPromise =
        this.prismaService.questionFollowerRelation.findMany({
          where: {
            questionId,
            followerId: {
              gte: firstFollowerId,
            },
          },
          take: pageSize + 1,
          orderBy: {
            followerId: 'asc',
          },
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
      throw new QuestionNotFoundError(questionId);
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
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[QuestionInvitationDto[], PageDto]> {
    const record2dto = async (
      invitation: QuestionInvitationRelation,
    ): Promise<QuestionInvitationDto> => {
      return {
        id: invitation.id,
        question_id: invitation.questionId,
        user: await this.userService.getUserDtoById(
          invitation.userId,
          viewerId,
          ip,
          userAgent,
        ),
        created_at: invitation.createdAt.getTime(),
        updated_at: invitation.updatedAt.getTime(),
        is_answered: await this.isQuestionAnsweredBy(
          questionId,
          invitation.userId,
        ),
      };
    };

    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
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
        throw new QuestionInvitationNotFoundError(pageStart);
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
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<UserDto[]> {
    if ((await this.isQuestionExists(questionId)) == false) {
      throw new QuestionNotFoundError(questionId);
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
        this.userService.getUserDtoById(entity.id, viewerId, ip, userAgent),
      ),
    );

    return userDtos;
  }
  async getQuestionInvitationDto(
    questionId: number,
    invitationId: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<QuestionInvitationDto> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: { id: invitationId, questionId },
      });
    if (!invitation) {
      throw new QuestionInvitationNotFoundError(invitationId);
    }
    const userdto = await this.userService.getUserDtoById(
      invitation.userId,
      viewerId,
      ip,
      userAgent,
    );
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
      throw new QuestionNotFoundError(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findFirst({
        where: { id: invitationId, questionId },
      });
    if (!invitation) {
      throw new QuestionInvitationNotFoundError(invitationId);
    }
    await this.prismaService.questionInvitationRelation.delete({
      where: {
        id: invitationId,
      },
    });
  }

  async isQuestionExists(questionId: number): Promise<boolean> {
    return (
      (await this.prismaService.question.count({
        where: {
          id: questionId,
        },
      })) > 0
    );
  }

  async setAttitudeToQuestion(
    questionId: number,
    userId: number,
    attitudeType: AttitudeType,
  ): Promise<AttitudeStateDto> {
    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);
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
      throw new QuestionNotFoundError(questionId);
    const invitation =
      await this.prismaService.questionInvitationRelation.findUnique({
        where: {
          questionId,
          id: invitationId,
        },
      });
    if (invitation == undefined)
      throw new QuestionInvitationNotFoundError(invitationId);
    return invitation.userId;
  }

  async setBounty(questionId: number, bounty: number): Promise<void> {
    /* istanbul ignore if */
    if (bounty < 0 || bounty > BOUNTY_LIMIT)
      throw new BountyOutOfLimitError(bounty);

    if ((await this.isQuestionExists(questionId)) == false)
      throw new QuestionNotFoundError(questionId);

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
      throw new QuestionNotFoundError(questionId);
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

  getQuestionCount(userId: number): Promise<number> {
    return this.prismaService.question.count({
      where: {
        createdById: userId,
      },
    });
  }

  async getUserAskedQuestions(
    userId: number,
    pageStart: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[QuestionDto[], PageDto]> {
    if ((await this.userService.isUserExists(userId)) == false)
      throw new UserIdNotFoundError(userId);
    if (!pageStart) {
      const currPage = await this.prismaService.question.findMany({
        where: {
          createdById: userId,
        },
        orderBy: {
          id: 'asc',
        },
        take: pageSize + 1,
      });
      const currDto = await Promise.all(
        currPage.map(async (entity) => {
          return this.getQuestionDto(entity.id, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(currDto, pageSize, (answer) => answer.id);
    } else {
      const prevPage = await this.prismaService.question.findMany({
        where: {
          createdById: userId,
          id: {
            lt: pageStart,
          },
        },
        orderBy: {
          id: 'desc',
        },
        take: pageSize,
      });
      const currPage = await this.prismaService.question.findMany({
        where: {
          createdById: userId,
          id: {
            gte: pageStart,
          },
        },
        orderBy: {
          id: 'asc',
        },
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

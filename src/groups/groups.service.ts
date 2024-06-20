/*
 *  Description: This file implements the groups service.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import {
  Inject,
  Injectable,
  Logger,
  NotImplementedException,
  forwardRef,
} from '@nestjs/common';
import { Group, GroupProfile } from '@prisma/client';
import { AnswerService } from '../answer/answer.service';
import { AvatarNotFoundError } from '../avatars/avatars.error';
import { AvatarsService } from '../avatars/avatars.service';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionNotFoundError } from '../questions/questions.error';
import { QuestionsService } from '../questions/questions.service';
import { UserDto } from '../users/DTO/user.dto';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { GetGroupQuestionsResultDto } from './DTO/get-group-questions.dto';
import { GroupDto } from './DTO/group.dto';
import { JoinGroupResultDto } from './DTO/join-group.dto';
import {
  CannotDeleteGroupError,
  GroupAlreadyJoinedError,
  GroupNameAlreadyUsedError,
  GroupNotFoundError,
  GroupNotJoinedError,
  GroupProfileNotFoundError,
  InvalidGroupNameError,
} from './groups.error';

export enum GroupQueryType {
  Recommend = 'recommend',
  Hot = 'hot',
  New = 'new',
}

@Injectable()
export class GroupsService {
  constructor(
    private usersService: UsersService,
    @Inject(forwardRef(() => QuestionsService))
    private questionsService: QuestionsService,
    @Inject(forwardRef(() => AnswerService))
    private answerService: AnswerService,
    private avatarsService: AvatarsService,
    private prismaService: PrismaService,
  ) {}

  private isValidGroupName(name: string): boolean {
    return /^[a-zA-Z0-9_\-\u4e00-\u9fa5]{1,16}$/.test(name);
  }

  get groupNameRule(): string {
    return 'Group display name must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.';
  }

  async isGroupExists(groupId: number): Promise<boolean> {
    return (
      (await this.prismaService.group.findUnique({
        where: {
          id: groupId,
        },
      })) != undefined
    );
  }

  async isGroupNameExists(groupName: string): Promise<boolean> {
    const ret = await this.prismaService.group.count({
      where: {
        name: groupName,
      },
    });
    if (ret > 1)
      Logger.error(`Group name ${groupName} is used more than once.`);
    return ret > 0;
  }

  async createGroup(
    name: string,
    userId: number,
    intro: string,
    avatarId: number,
    operatorId: number,
    ip: string,
    userAgent: string | undefined,
  ): Promise<GroupDto> {
    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    if (await this.isGroupNameExists(name)) {
      // todo: create log?
      throw new GroupNameAlreadyUsedError(name);
    }
    if ((await this.avatarsService.isAvatarExists(avatarId)) == false) {
      throw new AvatarNotFoundError(avatarId);
    }
    const group = await this.prismaService.group.create({
      data: {
        name,
        createdAt: new Date(),
      },
    });
    await this.avatarsService.plusUsageCount(avatarId);
    const groupProfile = await this.prismaService.groupProfile.create({
      data: {
        intro,
        avatarId,
        createdAt: new Date(),
        groupId: group.id,
        updatedAt: new Date(),
      },
    });

    await this.prismaService.groupMembership.create({
      data: {
        memberId: userId,
        groupId: group.id,
        role: 'owner',
        createdAt: new Date(),
      },
    });

    const userDto = await this.usersService.getUserDtoById(
      userId,
      operatorId,
      ip,
      userAgent,
    );

    return {
      id: group.id,
      name: group.name,
      intro: groupProfile.intro,
      avatarId: avatarId,
      owner: userDto,
      created_at: group.createdAt.getTime(),
      updated_at: group.updatedAt.getTime(),
      member_count: 1,
      question_count: 0,
      answer_count: 0,
      is_member: true,
      is_owner: true,
      is_public: true,
    };
  }

  async getGroups(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: number | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    keyword: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    page_start_id: number | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    page_size: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    order_type: GroupQueryType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ip: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userAgent: string | undefined,
  ): Promise<[GroupDto[], PageDto]> {
    throw new NotImplementedException();
    /*
    let queryBuilder = this.groupsRepository.createQueryBuilder('group');

    if (keyword) {
      queryBuilder = queryBuilder.where('group.name LIKE :key', {
        key: `%${keyword}%`,
      });
    }

    let prevEntity = undefined,
      currEntity = undefined;
    if (!page_start_id) {
      switch (order_type) {
        case GroupQueryType.Recommend:
          queryBuilder = queryBuilder.addSelect(
            'getRecommendationScore(group)',
            'score',
          );
          break;
        case GroupQueryType.Hot:
          queryBuilder = queryBuilder.addSelect(
            'getGroupHotness(group)',
            'hotness',
          );
          break;
        case GroupQueryType.New:
          queryBuilder = queryBuilder.orderBy('group.createdAt', 'DESC');
          break;
      }
      currEntity = await queryBuilder.limit(page_size + 1).getMany();
      const currDTOs = await Promise.all(
        currEntity.map((entity) =>
          this.getGroupDtoById(userId, entity.id, ip, userAgent),
        ),
      );
      return PageHelper.PageStart(currDTOs, page_size, (group) => group.id);
    } else {
      const referenceGroup = await this.groupsRepository.findOneBy({
        id: page_start_id,
      });
      if (!referenceGroup) {
        throw new GroupNotFoundError(page_start_id);
      }

      let referenceValue;
      switch (order_type) {
        case GroupQueryType.Recommend: {
          referenceValue = getRecommendationScore(referenceGroup);
          queryBuilder = queryBuilder.addSelect(
            'getRecommendationScore(group)',
            'score',
          );
          break;
        }
        case GroupQueryType.Hot: {
          referenceValue = getGroupHotness(referenceGroup);
          queryBuilder = queryBuilder.addSelect(
            'getGroupHotness(group)',
            'hotness',
          );
          break;
        }
        case GroupQueryType.New: {
          break;
        }
      }

      switch (order_type) {
        case GroupQueryType.Recommend:
          prevEntity = await queryBuilder
            .andWhere('recommendation_score > :referenceValue', {
              referenceValue,
            })
            .limit(page_size)
            .getMany();
          currEntity = await queryBuilder
            .andWhere('recommendation_score <= :referenceValue', {
              referenceValue,
            })
            .limit(page_size + 1)
            .getMany();
          break;
        case GroupQueryType.Hot:
          prevEntity = await queryBuilder
            .andWhere('hotness > :referenceValue', { referenceValue })
            .limit(page_size)
            .getMany();
          currEntity = await queryBuilder
            .andWhere('hotness <= :referenceValue', { referenceValue })
            .limit(page_size + 1)
            .getMany();
          break;
        case GroupQueryType.New: {
          const queryBuilderCopy = queryBuilder.clone();

          prevEntity = await queryBuilder
            .orderBy('id', 'ASC')
            .andWhere('id > :page_start_id', { page_start_id })
            .limit(page_size)
            .getMany();

          currEntity = await queryBuilderCopy
            .orderBy('id', 'DESC')
            .andWhere('id <= :page_start_id', { page_start_id })
            .limit(page_size + 1)
            .getMany();
          break;
        }
      }
      const currDTOs = await Promise.all(
        currEntity.map((entity) =>
          this.getGroupDtoById(userId, entity.id, ip, userAgent),
        ),
      );
      return PageHelper.PageMiddle(
        prevEntity,
        currDTOs,
        page_size,
        (group) => group.id,
        (group) => group.id,
      );
    }
      */
  }

  async getGroupDtoById(
    userId: number | undefined,
    groupId: number,
    ip: string,
    userAgent: string | undefined,
  ): Promise<GroupDto> {
    const group = await this.prismaService.group.findUnique({
      where: {
        id: groupId,
      },
      include: {
        groupProfile: true,
      },
    });
    if (group == undefined) {
      throw new GroupNotFoundError(groupId);
    }

    const ownership = await this.prismaService.groupMembership.findFirst({
      where: {
        groupId,
        role: 'owner',
      },
    });
    if (ownership == undefined) {
      throw new Error(`Group ${groupId} has no owner.`);
    }
    const ownerId = ownership.memberId;
    const ownerDto = await this.usersService.getUserDtoById(
      ownerId,
      userId,
      ip,
      userAgent,
    );

    const member_count = await this.prismaService.groupMembership.count({
      where: {
        groupId,
      },
    });
    const questions =
      await this.prismaService.groupQuestionRelationship.findMany({
        where: {
          groupId,
        },
      });
    const question_count = questions.length;
    const answer_count_promises = questions.map((question) =>
      this.answerService.countQuestionAnswers(question.id),
    );
    const answer_count = (await Promise.all(answer_count_promises)).reduce(
      (a, b) => a + b,
      0,
    );

    const is_member = userId
      ? (await this.prismaService.groupMembership.findFirst({
          where: {
            groupId,
            memberId: userId,
          },
        })) != undefined
      : false;
    const is_owner = userId ? ownerId == userId : false;

    return {
      id: group.id,
      name: group.name,
      intro:
        group.groupProfile?.intro ?? 'This user does not have an introduction.',
      avatarId:
        group.groupProfile?.avatarId ??
        (await this.avatarsService.getDefaultAvatarId()),
      owner: ownerDto,
      created_at: group.createdAt.getTime(),
      updated_at: group.updatedAt.getTime(),
      member_count,
      question_count,
      answer_count,
      is_member,
      is_owner,
      is_public: true, // todo: implement
    };
  }
  async getGroupProfile(groupId: number): Promise<GroupProfile> {
    const profile = await this.prismaService.groupProfile.findFirst({
      where: {
        groupId,
      },
    });
    if (profile == undefined) throw new GroupProfileNotFoundError(groupId);
    return profile;
  }
  async updateGroup(
    userId: number,
    groupId: number,
    name: string,
    intro: string,
    avatarId: number,
  ): Promise<void> {
    const group = await this.prismaService.group.findUnique({
      where: {
        id: groupId,
      },
      include: {
        groupProfile: true,
      },
    });
    if (group == undefined) {
      throw new GroupNotFoundError(groupId);
    }

    const userMembership = await this.prismaService.groupMembership.findFirst({
      where: {
        groupId,
        memberId: userId,
        role: { in: ['owner', 'admin'] },
      },
    });
    if (userMembership == undefined) {
      throw new CannotDeleteGroupError(groupId);
    }

    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    if (await this.isGroupNameExists(name)) {
      // todo: create log?
      throw new GroupNameAlreadyUsedError(name);
    }
    if ((await this.avatarsService.isAvatarExists(avatarId)) == false) {
      throw new AvatarNotFoundError(avatarId);
    }
    const preAvatarId = group.groupProfile?.avatarId;
    if (preAvatarId) await this.avatarsService.minusUsageCount(preAvatarId);
    await this.avatarsService.plusUsageCount(avatarId);
    await this.prismaService.group.update({
      where: {
        id: groupId,
      },
      data: {
        name,
      },
    });
    await this.prismaService.groupProfile.update({
      where: {
        groupId,
      },
      data: {
        intro,
        avatarId,
      },
    });
  }

  async deleteGroup(userId: number, groupId: number): Promise<void> {
    if ((await this.isGroupExists(groupId)) == false)
      throw new GroupNotFoundError(groupId);

    const owner = await this.prismaService.groupMembership.findFirst({
      where: {
        groupId,
        memberId: userId,
        role: 'owner',
      },
    });
    if (owner == undefined) {
      throw new CannotDeleteGroupError(groupId);
    }

    await this.prismaService.group.update({
      where: {
        id: groupId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    await this.prismaService.groupProfile.update({
      where: {
        groupId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    await this.prismaService.groupMembership.updateMany({
      where: {
        groupId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async isUserWithinGroup(userId: number, groupId: number): Promise<boolean> {
    return (
      (await this.prismaService.groupMembership.findFirst({
        where: {
          memberId: userId,
          groupId,
        },
      })) != undefined
    );
  }

  async joinGroup(
    userId: number,
    groupId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    intro: string,
  ): Promise<JoinGroupResultDto> {
    if ((await this.isGroupExists(groupId)) == false)
      throw new GroupNotFoundError(groupId);

    if (await this.isUserWithinGroup(userId, groupId))
      throw new GroupAlreadyJoinedError(groupId);

    await this.prismaService.groupMembership.create({
      data: {
        groupId,
        memberId: userId,
        role: 'member',
        createdAt: new Date(),
      },
    });

    const member_count = await this.prismaService.groupMembership.count({
      where: {
        groupId,
      },
    });
    const is_member = true;
    const is_waiting = false; // todo: pending logic
    return { member_count, is_member, is_waiting };
  }

  async quitGroup(userId: number, groupId: number): Promise<number> {
    if ((await this.isGroupExists(groupId)) == false)
      throw new GroupNotFoundError(groupId);

    if ((await this.isUserWithinGroup(userId, groupId)) == false)
      throw new GroupNotJoinedError(groupId);

    await this.prismaService.groupMembership.updateMany({
      where: {
        groupId,
        memberId: userId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    const member_count = await this.prismaService.groupMembership.count({
      where: {
        groupId,
      },
    });
    return member_count;
  }

  async getGroupMembers(
    groupId: number,
    firstMemberId: number | undefined,
    page_size: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[UserDto[], PageDto]> {
    if ((await this.isGroupExists(groupId)) == false)
      throw new GroupNotFoundError(groupId);

    if (!firstMemberId) {
      const entity = await this.prismaService.groupMembership.findMany({
        where: {
          groupId,
        },
        orderBy: {
          id: 'asc',
        },
        take: page_size + 1,
      });
      const DTOs = await Promise.all(
        entity.map((entity) =>
          this.usersService.getUserDtoById(
            entity.memberId,
            viewerId,
            ip,
            userAgent,
          ),
        ),
      );
      return PageHelper.PageStart(DTOs, page_size, (user) => user.id);
    } else {
      // firstMemberId is not undefined
      const firstMember = await this.prismaService
        .withoutExtensions()
        .groupMembership.findFirst({
          where: {
            groupId,
            memberId: firstMemberId,
          },
        });
      // ! first member may be deleted while the request on sending
      // ! so we need to include deleted members to get the correct reference value
      // ! i.e. member joined time(id) here

      if (firstMember == undefined) {
        throw new UserIdNotFoundError(firstMemberId);
      }
      const firstMemberJoinedId = firstMember.id;

      const prevEntity = this.prismaService.groupMembership.findMany({
        where: {
          groupId,
          id: { lt: firstMemberJoinedId },
        },
        take: page_size,
        orderBy: {
          id: 'desc',
        },
      });
      const currEntity = this.prismaService.groupMembership.findMany({
        where: {
          groupId,
          id: { gte: firstMemberJoinedId },
        },
        take: page_size + 1,
        orderBy: {
          id: 'asc',
        },
      });
      const currDTOs = await Promise.all(
        (await currEntity).map((entity) =>
          this.usersService.getUserDtoById(
            entity.memberId,
            viewerId,
            ip,
            userAgent,
          ),
        ),
      );
      return PageHelper.PageMiddle(
        await prevEntity,
        currDTOs,
        page_size,
        (user) => user.memberId,
        (user) => user.id,
      );
    }
  }

  async getGroupQuestions(
    groupId: number,
    page_start_id: number | undefined,
    page_size: number,
    viewerId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<GetGroupQuestionsResultDto> {
    if (page_start_id) {
      const referenceRelationship =
        await this.prismaService.groupQuestionRelationship.findFirst({
          where: {
            questionId: page_start_id,
            groupId,
          },
        });
      if (!referenceRelationship) {
        throw new QuestionNotFoundError(page_start_id);
      }
      const referenceValue = referenceRelationship.createdAt;
      const prev = await this.prismaService.groupQuestionRelationship.findMany({
        where: {
          groupId,
          createdAt: { gt: referenceValue },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: page_size,
      });
      const curr = await this.prismaService.groupQuestionRelationship.findMany({
        where: {
          groupId,
          createdAt: { lte: referenceValue },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: page_size + 1,
      });
      const DTOs = await Promise.all(
        curr.map((relationship) =>
          this.questionsService.getQuestionDto(
            relationship.questionId,
            viewerId,
            ip,
            userAgent,
          ),
        ),
      );
      const [retDTOs, page] = PageHelper.PageMiddle(
        prev,
        DTOs,
        page_size,
        (relationship) => relationship.questionId,
        (questionDto) => questionDto.id,
      );
      return {
        questions: retDTOs,
        page,
      };
    } else {
      const curr = await this.prismaService.groupQuestionRelationship.findMany({
        where: {
          groupId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: page_size + 1,
      });
      const DTOs = await Promise.all(
        curr.map((relationship) =>
          this.questionsService.getQuestionDto(
            relationship.questionId,
            viewerId,
            ip,
            userAgent,
          ),
        ),
      );
      const [retDTOs, page] = PageHelper.PageStart(
        DTOs,
        page_size,
        (questionDto) => questionDto.id,
      );
      return {
        questions: retDTOs,
        page,
      };
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRecommendationScore(referenceGroup: Group): number {
  throw new Error('Function getRecommendationScore not implemented.');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getGroupHotness(referenceGroup: Group): number {
  throw new Error('Function getGroupHotness not implemented.');
}

/*
 *  Description: This file implements the groups service.
 *               It is responsible for the business logic of questions.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { QuestionIdNotFoundError } from '../questions/questions.error';
import { QuestionsService } from '../questions/questions.service';
import { UserDto } from '../users/DTO/user.dto';
import { BadRequestError, UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { GetGroupQuestionsResultDto } from './DTO/get-group-questions.dto';
import { GroupDto } from './DTO/group.dto';
import { JoinGroupResultDto } from './DTO/join-group.dto';
import { GroupProfile } from './group-profile.entity';
import {
  Group,
  GroupMembership,
  GroupQuestionRelationship,
  GroupTarget,
} from './group.entity';
import {
  CannotDeleteGroupError,
  GroupAlreadyJoinedError,
  GroupIdNotFoundError,
  GroupNameAlreadyUsedError,
  GroupNotJoinedError,
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
    private questionsService: QuestionsService,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(GroupProfile)
    private groupProfilesRepository: Repository<GroupProfile>,
    @InjectRepository(GroupMembership)
    private groupMembershipsRepository: Repository<GroupMembership>,
    @InjectRepository(GroupQuestionRelationship)
    private groupQuestionRelationshipsRepository: Repository<GroupQuestionRelationship>,
    @InjectRepository(GroupTarget)
    private groupTargetsRepository: Repository<GroupTarget>,
  ) {}

  private isValidGroupName(name: string): boolean {
    return /^[a-zA-Z0-9_\-\u4e00-\u9fa5]{1,16}$/.test(name);
  }

  get groupNameRule(): string {
    return 'Group display name must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.';
  }

  async createGroup(
    name: string,
    userId: number,
    intro: string,
    avatar: string,
  ): Promise<GroupDto> {
    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    if ((await this.groupsRepository.findOneBy({ name })) != null) {
      // todo: create log?
      throw new GroupNameAlreadyUsedError(name);
    }

    const group = this.groupsRepository.create({ name });
    await this.groupsRepository.save(group);

    const groupProfile = this.groupProfilesRepository.create({
      groupId: group.id,
      intro,
      avatar,
    });
    await this.groupProfilesRepository.save(groupProfile);

    const GroupMembership = this.groupMembershipsRepository.create({
      memberId: userId,
      groupId: group.id,
      role: 'owner',
    });
    await this.groupMembershipsRepository.save(GroupMembership);

    const userDto = await this.usersService.getUserDtoById(userId);

    return {
      id: group.id,
      name: group.name,
      intro: groupProfile.intro,
      avatar: groupProfile.avatar,
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
    userId: number,
    keyword: string,
    page_start_id: number | null,
    page_size: number,
    order_type: GroupQueryType,
  ): Promise<[GroupDto[], PageRespondDto]> {
    if (page_size <= 0) {
      throw new BadRequestError('pageSize should be positive number');
    }

    let queryBuilder = this.groupsRepository.createQueryBuilder('group');

    if (keyword) {
      queryBuilder = queryBuilder.where('group.name LIKE :key', {
        key: `%${keyword}%`,
      });
    }

    let prevEntity = null,
      currEntity = null;
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
        currEntity.map((entity) => this.getGroupDtoById(userId, entity.id)),
      );
      return PageHelper.PageStart(currDTOs, page_size, (group) => group.id);
    } else {
      const referenceGroup = await this.groupsRepository.findOneBy({
        id: page_start_id,
      });
      if (!referenceGroup) {
        throw new GroupIdNotFoundError(page_start_id);
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
          let queryBuilderCopy = queryBuilder.clone();

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
        currEntity.map((entity) => this.getGroupDtoById(userId, entity.id)),
      );
      return PageHelper.PageMiddle(
        prevEntity,
        currDTOs,
        page_size,
        (group) => group.id,
        (group) => group.id,
      );
    }
  }

  async getGroupDtoById(userId: number, groupId: number): Promise<GroupDto> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['profile'],
    });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }

    const ownership = await this.groupMembershipsRepository.findOneBy({
      groupId,
      role: 'owner',
    });
    if (ownership == null) {
      throw new Error(`Group ${groupId} has no owner.`);
    }
    const ownerId = ownership.memberId;
    const ownerDto = await this.usersService.getUserDtoById(ownerId);

    const member_count = await this.groupMembershipsRepository.countBy({
      groupId,
    });
    const questions = await this.groupQuestionRelationshipsRepository.findBy({
      groupId,
    });
    const question_count = questions.length;
    const getQuestionAnswerCount = async (questionId: number) =>
      (await this.questionsService.getQuestionDto(questionId)).answer_count;
    const answer_count_promises = questions.map((question) =>
      getQuestionAnswerCount(question.id),
    );
    const answer_count = (await Promise.all(answer_count_promises)).reduce(
      (a, b) => a + b,
      0,
    );

    const is_member =
      (await this.groupMembershipsRepository.findOneBy({
        groupId,
        memberId: userId,
      })) != null;
    const is_owner = ownerId == userId;

    return {
      id: group.id,
      name: group.name,
      intro: group.profile.intro,
      avatar: group.profile.avatar,
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

  async updateGroup(
    userId: number,
    groupId: number,
    name: string,
    intro: string,
    avatar: string,
  ): Promise<void> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['profile'],
    });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }

    const userMembership = await this.groupMembershipsRepository.findOneBy({
      groupId,
      memberId: userId,
      role: In(['owner', 'admin']),
    });
    if (userMembership == null) {
      throw new CannotDeleteGroupError(groupId);
    }

    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    if ((await this.groupsRepository.findOneBy({ name })) != null) {
      // todo: create log?
      throw new GroupNameAlreadyUsedError(name);
    }
    group.name = name;
    group.profile.intro = intro;
    group.profile.avatar = avatar;
    await this.groupsRepository.save(group);
    await this.groupProfilesRepository.save(group.profile);
  }

  async deleteGroup(userId: number, groupId: number): Promise<void> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['profile'],
    });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }

    const owner = await this.groupMembershipsRepository.findOneBy({
      groupId,
      memberId: userId,
      role: 'owner',
    });
    if (owner == null) {
      throw new CannotDeleteGroupError(groupId);
    }

    await this.groupProfilesRepository.softRemove(group.profile);
    await this.groupMembershipsRepository.softRemove({ groupId });
    await this.groupsRepository.softRemove(group);
  }

  async joinGroup(
    userId: number,
    groupId: number,
    intro: string,
  ): Promise<JoinGroupResultDto> {
    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }

    if (
      (await this.groupMembershipsRepository.findOneBy({
        groupId,
        memberId: userId,
      })) != null
    ) {
      throw new GroupAlreadyJoinedError(groupId);
    }

    await this.groupMembershipsRepository.insert({
      groupId,
      memberId: userId,
      role: 'member',
    });

    const member_count = await this.groupMembershipsRepository.countBy({
      groupId,
    });
    const is_member = true;
    const is_waiting = false; // todo: pending logic
    return { member_count, is_member, is_waiting };
  }

  async quitGroup(userId: number, groupId: number): Promise<number> {
    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }

    const membership = await this.groupMembershipsRepository.findOneBy({
      groupId,
      memberId: userId,
    });
    if (membership == null) {
      throw new GroupNotJoinedError(groupId);
    }

    // todo: check if user is owner
    await this.groupMembershipsRepository.softDelete({
      groupId,
      memberId: userId,
    });
    const member_count = await this.groupMembershipsRepository.countBy({
      groupId,
    });
    return member_count;
  }

  async getGroupMembers(
    groupId: number,
    firstMemberId: number | undefined,
    page_size: number,
  ): Promise<[UserDto[], PageRespondDto]> {
    if ((await this.groupsRepository.findOneBy({ id: groupId })) == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    if (page_size <= 0) {
      throw new BadRequestError('pageSize should be positive number');
    }

    if (!firstMemberId) {
      const entity = await this.groupMembershipsRepository.find({
        where: { groupId },
        order: { id: 'ASC' },
        take: page_size + 1,
      });
      const DTOs = await Promise.all(
        entity.map((entity) =>
          this.usersService.getUserDtoById(entity.memberId),
        ),
      );
      return PageHelper.PageStart(DTOs, page_size, (user) => user.id);
    }
    // firstMemberId is not null
    const firstMember = await this.groupMembershipsRepository.findOne({
      where: { groupId, memberId: firstMemberId },
      withDeleted: true,
    }); // ! first member may be deleted while the request on sending
    // ! so we need to include deleted members to get the correct reference value
    // ! i.e. member joined time(id) here

    if (firstMember == null) {
      throw new UserIdNotFoundError(firstMemberId);
    }
    const firstMemberJoinedId = firstMember.id;

    const prevEntity = this.groupMembershipsRepository.find({
      where: {
        groupId,
        id: LessThan(firstMemberJoinedId),
      },
      take: page_size,
      order: { id: 'DESC' },
    });
    const currEntity = this.groupMembershipsRepository.find({
      where: {
        groupId,
        id: MoreThanOrEqual(firstMemberJoinedId),
      },
      take: page_size + 1,
      order: { id: 'ASC' },
    });
    const currDTOs = await Promise.all(
      (await currEntity).map((entity) =>
        this.usersService.getUserDtoById(entity.memberId),
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

  async getGroupQuestions(
    groupId: number,
    page_start_id: number | undefined,
    page_size: number,
  ): Promise<GetGroupQuestionsResultDto> {
    let queryBuilder = this.groupQuestionRelationshipsRepository
      .createQueryBuilder('relationship')
      .where('relationship.groupId = :groupId', { groupId });
    queryBuilder = queryBuilder.orderBy('relationship.createdAt', 'DESC');

    let prevDTOs = null,
      currDTOs = null;
    if (page_start_id) {
      const referenceRelationship =
        await this.groupQuestionRelationshipsRepository.findOneBy({
          questionId: page_start_id,
        });
      if (!referenceRelationship) {
        throw new QuestionIdNotFoundError(page_start_id);
      }
      const referenceValue = referenceRelationship.createdAt;
      prevDTOs = await queryBuilder
        .andWhere('relationship.createdAt > :referenceValue', {
          referenceValue,
        })
        .limit(page_size)
        .getMany();
      currDTOs = await queryBuilder
        .andWhere('relationship.createdAt <= :referenceValue', {
          referenceValue,
        })
        .limit(page_size + 1)
        .getMany();
    } else {
      prevDTOs = null;
      currDTOs = await queryBuilder.limit(page_size + 1).getMany();
    }
    const has_prev = prevDTOs && prevDTOs.length > 0;
    const has_more = currDTOs && currDTOs.length > page_size;
    const page_start = currDTOs[0].questionId;
    const real_page_size =
      currDTOs.length > page_size ? page_size : currDTOs.length;
    const questions = await Promise.all(
      currDTOs.map((relationship) =>
        this.questionsService.getQuestionDto(relationship.questionId),
      ),
    );
    return {
      questions,
      page: {
        page_start,
        page_size: real_page_size,
        has_prev,
        prev_start: has_prev ? prevDTOs[0].questionId : null,
        has_more,
        next_start: has_more ? currDTOs[page_size - 1].questionId : null,
      },
    };
  }
}

function getRecommendationScore(referenceGroup: Group): number {
  throw new Error('Function getRecommendationScore not implemented.');
}

function getGroupHotness(referenceGroup: Group): number {
  throw new Error('Function getGroupHotness not implemented.');
}

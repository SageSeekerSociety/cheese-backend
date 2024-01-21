// src/groups/group.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GetGroupsResultDto } from './DTO/get-groups.dto';
import { GroupDto } from './DTO/group.dto';
import { JoinGroupResultDto } from './DTO/join-group.dto';
import { Group, GroupMembership, GroupProfile, GroupTarget } from './group.entity';
import { CannotDeleteGroupError, GroupIdNotFoundError, GroupNameAlreadyExistsError, InvalidGroupNameError } from './groups.error';

export enum GroupQueryType {
  Recommend = 'recommend',
  Hot = 'hot',
  New = 'new',
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(GroupProfile)
    private groupProfilesRepository: Repository<GroupProfile>,
    @InjectRepository(GroupMembership)
    private groupMembershipsRepository: Repository<GroupMembership>,
    @InjectRepository(GroupTarget)
    private groupTargetsRepository: Repository<GroupTarget>,
  ) { }

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
    if (await this.groupsRepository.findOneBy({ name })) {
      // todo: create log?
      throw new GroupNameAlreadyExistsError(name);
    }

    const group = this.groupsRepository.create({ name });
    await this.groupsRepository.save(group);

    const groupProfile = this.groupProfilesRepository.create({
      group,
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

    return {
      id: group.id,
      name: group.name,
      intro: groupProfile.intro,
      avatar: groupProfile.avatar,
    };
  }

  async getGroups(
    key: string,
    page_start_id: number,
    page_size: number,
    order_type: GroupQueryType,
  ): Promise<GetGroupsResultDto> {
    let queryBuilder = this.groupsRepository.createQueryBuilder('group');

    if (key) {
      queryBuilder = queryBuilder.where('group.name LIKE :key', { key: `%${key}%` });
    }

    let prevDTOs = null, currDTOs = null;
    if (page_start_id) {
      const referenceGroup = await this.groupsRepository.findOneBy({ id: page_start_id });
      if (!referenceGroup) {
        throw new GroupIdNotFoundError(page_start_id);
      }
      let referenceValue;
      switch (order_type) {
        case GroupQueryType.Recommend: {
          referenceValue = getRecommendationScore(referenceGroup);
          queryBuilder = queryBuilder
            .addSelect('getRecommendationScore(group)', 'score');
          break;
        }
        case GroupQueryType.Hot: {
          referenceValue = getGroupHotness(referenceGroup);
          queryBuilder = queryBuilder
            .addSelect('getGroupHotness(group)', 'hotness')
          break;
        }
        case GroupQueryType.New: {
          referenceValue = referenceGroup.createdAt;
          break;
        }
      }
      queryBuilder = queryBuilder.orderBy(order_type, 'DESC')
      switch (order_type) {
        case GroupQueryType.Recommend:
          prevDTOs = await queryBuilder
            .andWhere('recommendation_score > :referenceValue', { referenceValue })
            .limit(page_size)
            .getMany();
          currDTOs = await queryBuilder
            .andWhere('recommendation_score <= :referenceValue', { referenceValue })
            .limit(page_size + 1)
            .getMany();
          break;
        case GroupQueryType.Hot:
          prevDTOs = await queryBuilder
            .andWhere('hotness > :referenceValue', { referenceValue })
            .limit(page_size)
            .getMany();
          currDTOs = await queryBuilder
            .andWhere('hotness <= :referenceValue', { referenceValue })
            .limit(page_size + 1)
            .getMany();
          break;
        case GroupQueryType.New:
          prevDTOs = await queryBuilder
            .andWhere('createdAt > :referenceValue', { referenceValue })
            .limit(page_size)
            .getMany();
          currDTOs = await queryBuilder
            .andWhere('createdAt <= :referenceValue', { referenceValue })
            .limit(page_size + 1)
            .getMany();
          break;
      }
    } else {
      prevDTOs = null;
      currDTOs = await queryBuilder
        .limit(page_size + 1)
        .getMany();
    }
    const has_prev = prevDTOs && prevDTOs.length > 0;
    const has_more = currDTOs && currDTOs.length > page_size;
    const page_start = currDTOs[0].id;
    const real_page_size = currDTOs.length > page_size ? page_size : currDTOs.length;
    const next_start = currDTOs[page_size - 1].id;
    const groups = currDTOs.map(group => ({
      id: group.id,
      name: group.name,
      intro: group.profile.intro,
      avatar: group.profile.avatar,
    }));
    return {
      groups,
      page: {
        page_start,
        page_size: real_page_size,
        has_prev,
        prev_start: has_prev ? prevDTOs[0].id : null,
        has_more,
        next_start: has_more ? next_start : null,
      }
    };

  }

  async getGroupDtoById(id: number): Promise<GroupDto> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: ['profile'],
    })
    if (group == null) {
      throw new GroupIdNotFoundError(id);
    }
    return {
      id: group.id,
      name: group.name,
      intro: group.profile.intro,
      avatar: group.profile.avatar,
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
    if (await this.groupsRepository.findOneBy({ name })) {
      // todo: create log?
      throw new GroupNameAlreadyExistsError(name);
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
      group,
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
    userId: number, groupId: number, intro: string
  ): Promise<JoinGroupResultDto> {
    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    if (await this.groupMembershipsRepository.findOneBy({ groupId, memberId: userId })) {
      return; // or throw error?
    }

    await this.groupMembershipsRepository.insert({
      groupId,
      memberId: userId,
      role: 'member',
    });

    const member_count = await this.groupMembershipsRepository.countBy({ groupId });
    const is_member = true;
    const is_waiting = false; // todo: pending logic
    return { member_count, is_member, is_waiting };
  }

  async quitGroup(userId: number, groupId: number): Promise<number> {
    const group = await this.groupsRepository.findOneBy({ id: groupId })
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    // todo: check if user is owner
    await this.groupMembershipsRepository.softDelete({ group, memberId: userId });
    const member_count = await this.groupMembershipsRepository.countBy({ groupId });
    return member_count;
  }
}
function getRecommendationScore(referenceGroup: Group): number {
  throw new Error('Function not implemented.');
}

function getGroupHotness(referenceGroup: Group): number {
  throw new Error('Function not implemented.');
}


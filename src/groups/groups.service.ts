// src/groups/group.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GetGroupsRespondDto } from './DTO/get-groups.dto';
import { GroupDto } from './DTO/group.dto';
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
    private GroupMembershipsRepository: Repository<GroupMembership>,
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

    const GroupMembership = this.GroupMembershipsRepository.create({
      memberId: userId,
      groupId: group.id,
      role: 'owner',
    });
    await this.GroupMembershipsRepository.save(GroupMembership);

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
  ): Promise<GetGroupsRespondDto> {
    let queryBuilder = this.groupsRepository.createQueryBuilder('group');

    if (key) {
      queryBuilder = queryBuilder.where('group.name LIKE :key', { key: `%${key}%` });
    }

    if (page_start_id) {
      const referenceGroup = await this.groupsRepository.findOneBy({ id: page_start_id });
      if (!referenceGroup) {
        throw new GroupIdNotFoundError(page_start_id);
      }
      switch (order_type) {
        case GroupQueryType.Recommend: {
          let referenceValue = getRecommendationScore(referenceGroup);
          queryBuilder = queryBuilder
            .addSelect('getRecommendationScore(group)', 'score')
            .andWhere('score < :referenceValue', { referenceValue });
          break;
        }
        case GroupQueryType.Hot: {
          let referenceValue = getGroupHotness(referenceGroup);
          queryBuilder = queryBuilder
            .addSelect('getGroupHotness(group)', 'hotness')
            .andWhere('hotness < :referenceValue', { referenceValue });
          break;
        }
        case GroupQueryType.New: {
          let referenceValue = referenceGroup.createdAt;
          queryBuilder = queryBuilder
            .andWhere('group.createdAt < :referenceValue', { referenceValue });
          break;
        }
      }
    }

    queryBuilder = queryBuilder.orderBy(order_type, 'DESC')

    const groups = await queryBuilder.getMany();

    const groupsDto = groups.map(group => ({
      id: group.id,
      name: group.name,
      intro: group.profile.intro,
      avatar: group.profile.avatar,
    }));

    return {
      code: 200,
      message: 'Groups retrieved successfully.',
      data: {
        groups: groupsDto,
        page
      },
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

    const userMembership = await this.GroupMembershipsRepository.findOneBy({
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

    const owner = await this.GroupMembershipsRepository.findOneBy({
      group,
      memberId: userId,
      role: 'owner',
    });
    if (owner == null) {
      throw new CannotDeleteGroupError(groupId);
    }

    await this.groupProfilesRepository.softRemove(group.profile);
    await this.GroupMembershipsRepository.softRemove({ groupId });
    await this.groupsRepository.softRemove(group);
  }

  async joinGroup(userId: number, groupId: number, intro: string): Promise<void> {
    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    if (await this.GroupMembershipsRepository.findOneBy({ groupId, memberId: userId })) {
      return; // or throw error?
    }

    await this.GroupMembershipsRepository.insert({
      groupId,
      memberId: userId,
      role: 'member',
    });
  }

  async quitGroup(userId: number, groupId: number): Promise<void> {
    const group = await this.groupsRepository.findOneBy({ id: groupId })
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    // todo: check if user is owner
    await this.GroupMembershipsRepository.softDelete({ group, memberId: userId });
  }
}
function getRecommendationScore(referenceGroup: Group): number {
  throw new Error('Function not implemented.');
}

function getGroupHotness(referenceGroup: Group): number {
  throw new Error('Function not implemented.');
}


// src/groups/group.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Repository } from 'typeorm';
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
    if (await this.groupsRepository.findOne({ where: { name } })) {
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
    page: number,
    size: number,
    key: string,
    type: GroupQueryType,
  ): Promise<Group[]> {
    const skip = (page - 1) * size;
    const query = this.groupsRepository.createQueryBuilder('group');
    if (key) {
      query.where('group.name like :key', { key: `%${key}%` });
    }
    switch (type) {
      case GroupQueryType.Recommend:
        query.orderBy('group.createdAt', 'DESC');
        break;
      case GroupQueryType.Hot:
        query.orderBy('group.membersCount', 'DESC');
        break;
      case GroupQueryType.New:
        query.orderBy('group.createdAt', 'DESC');
        break;
    }
    query.skip(skip).take(size);
    return query.getMany();
  }

  async getGroupDtoById(id: number): Promise<GroupDto> {
    const group = await this.groupsRepository.findOneBy({ id });
    if (group == null) {
      throw new GroupIdNotFoundError(id);
    }
    const groupProfile = await this.groupProfilesRepository.findOneBy({ group });
    if (groupProfile == null) {
      Logger.error(`Group profile not found for group ${id}`);
      return {
        id: group.id,
        name: group.name,
        intro: '',
        avatar: '',
      };
    }
    return {
      id: group.id,
      name: group.name,
      intro: groupProfile.intro,
      avatar: groupProfile.avatar,
    };
  }

  async updateGroup(
    id: number,
    name: string,
    intro: string,
    avatar: string,
  ): Promise<void> {
    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    const group = await this.groupsRepository.findOneBy({ id });
    if (group == null) {
      throw new GroupIdNotFoundError(id);
    }
    group.name = name;
    await this.groupsRepository.save(group);

    const groupProfile = await this.groupProfilesRepository.findOneBy({ group });
    if (groupProfile == null) {
      Logger.error(`Group profile not found for group ${id}`);
      return;
    }
    groupProfile.intro = intro;
    groupProfile.avatar = avatar;
    await this.groupProfilesRepository.save(groupProfile);
  }

  async deleteGroup(userId: number, groupId: number): Promise<void> {
    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    const owner = await this.GroupMembershipsRepository.findOneBy({
      group,
      role: 'owner',
    });
    assert(owner != null, 'Group owner not found');
    if (owner.memberId !== userId) {
      throw new CannotDeleteGroupError(groupId);
    }
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
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['profile'],
    })
    if (group == null) {
      throw new GroupIdNotFoundError(groupId);
    }
    await this.GroupMembershipsRepository.softDelete({ groupId, memberId: userId });
  }
}

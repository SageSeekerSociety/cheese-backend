// src/groups/group.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupDto } from './DTO/group.dto';
import { Group, GroupMember, GroupProfile, GroupTarget } from './group.entity';
import { GroupIdNotFoundError, GroupNameAlreadyExistsError, InvalidGroupNameError } from './groups.error';

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
    @InjectRepository(GroupMember)
    private groupMembersRepository: Repository<GroupMember>,
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
    ownerId: number,
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

    const group = this.groupsRepository.create({
      name,
      ownerId,
    });
    await this.groupsRepository.save(group);

    const groupProfile = this.groupProfilesRepository.create({
      group,
      intro,
      avatar,
    });
    await this.groupProfilesRepository.save(groupProfile);

    const groupMember = this.groupMembersRepository.create({
      memberId: ownerId,
      groupId: group.id,
      role: 'owner',
    });
    await this.groupMembersRepository.save(groupMember);

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

  async deleteGroup(id: number): Promise<void> {
    await this.groupsRepository.delete(id);
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    await this.groupMembersRepository.insert({
      userId,
      groupId,
    });
    const group = await this.groupsRepository.findOne(groupId);
    group.membersCount++;
    await this.groupsRepository.save(group);
  }

  async leaveGroup(userId: number, groupId: number): Promise<void> {
    await this.groupMembersRepository.delete({ userId, groupId });
    const group = await this.groupsRepository.findOne(groupId);
    group.membersCount--;
    await this.groupsRepository.save(group);
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return this.groupMembersRepository.find({ groupId });
  }

  async getGroupTargets(groupId: number): Promise<GroupTarget[]> {
    return this.groupTargetsRepository.find({ groupId });
  }

  async getGroupTargetsByUserId(userId: number): Promise<GroupTarget[]> {
    return this.groupTargetsRepository.find({ userId });
  }

  async getGroupTargetsByGroupId(groupId: number): Promise<GroupTarget[]> {
    return this.groupTargetsRepository.find({ groupId });
  }

  async getGroupTargetByUserIdAndGroupId(
    userId: number,
    groupId: number,
  ): Promise<GroupTarget> {
    return this.groupTargetsRepository.findOne({ userId, groupId });
  }

  async updateGroupTarget(
    userId: number,
    groupId: number,
    target: string,
  ): Promise<GroupTarget> {
    const groupTarget = await this.groupTargetsRepository.findOne({
      userId,
      groupId,
    });
    groupTarget.target = target;
    await this.groupTargetsRepository.save(groupTarget);
    return groupTarget;
  }

  async createGroupTarget(
    userId: number,
    groupId: number,
    target: string,
  ): Promise<GroupTarget> {
    await this.groupTargetsRepository.insert({ userId, groupId, target });
    return this.groupTargetsRepository.findOne({ userId, groupId });
  }

  async deleteGroupTarget(
    userId: number,
    groupId: number,
  ): Promise<GroupTarget> {
    const groupTarget = await this.groupTargetsRepository.findOne({
      userId,
      groupId,
    });
    await this.groupTargetsRepository.delete({ userId, groupId });
    return groupTarget;
  }

  async getGroupProfile(groupId: number): Promise<GroupProfile> {
    return this.groupProfilesRepository.findOne({ groupId });
  }

  async getGroupProfileByUserId(userId: number): Promise<GroupProfile> {
    return this.groupProfilesRepository.findOne({ userId });
  }

  async updateGroupProfile(
    groupId: number,
    intro: string,
    avatar: string,
  ): Promise<GroupProfile> {
    const groupProfile = await this.groupProfilesRepository.findOne({
      groupId,
    });
    groupProfile.intro = intro;
    groupProfile.avatar = avatar;
    await this.groupProfilesRepository.save(groupProfile);
    return groupProfile;
  }

  async createGroupProfile(
    groupId: number,
    intro: string,
    avatar: string,
  ): Promise<GroupProfile> {
    await this.groupProfilesRepository.insert({ groupId, intro, avatar });
    return this.groupProfilesRepository.findOne({ groupId });
  }

  async deleteGroupProfile(groupId: number): Promise<GroupProfile> {
    const groupProfile = await this.groupProfilesRepository.findOne({
      groupId,
    });
    await this.groupProfilesRepository.delete({ groupId });
    return groupProfile;
  }
}

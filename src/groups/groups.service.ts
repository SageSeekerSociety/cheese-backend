// src/groups/group.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupMember, GroupProfile, GroupTarget } from './group.entity';
import { GroupNameAlreadyExistsError, InvalidGroupNameError } from './groups.error';

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
    name: string, // todo: displayName
    intro: string,
    avatar: string,
  ): Promise<Group> {
    if (!this.isValidGroupName(name)) {
      throw new InvalidGroupNameError(name, this.groupNameRule);
    }
    if (await this.groupsRepository.findOne({ name })) {
      // todo: create log?
      throw new GroupNameAlreadyExistsError(name);
    }
    await this.groupsRepository.insert({ name });
    const group = await this.groupsRepository.findOne({ name });
    await this.groupProfilesRepository.insert({
      group,
      intro,
      avatar,
    });
    return group;
  }

  // Implement other methods such as getGroupById, updateGroup, deleteGroup, etc.
}

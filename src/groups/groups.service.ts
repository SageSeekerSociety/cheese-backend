// src/groups/group.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGroupDto } from './DTO/create-group.dto';
import { Group } from './group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) { }

  async createGroup(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = new Group();
    group.name = createGroupDto.name;
    // other assignments

    return this.groupsRepository.save(group);
  }

  // Implement other methods such as getGroupById, updateGroup, deleteGroup, etc.
}

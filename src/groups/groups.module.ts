/*
 *  Description: This file defines the groups module.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';
import { GroupProfile } from './group-profile.entity';
import { GroupsController } from './groups.controller';
import {
  Group,
  GroupMembership,
  GroupQuestionRelationship,
  GroupTarget,
} from './groups.legacy.entity';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupProfile,
      GroupMembership,
      GroupQuestionRelationship,
      GroupTarget,
    ]),
    AuthModule,
    UsersModule,
    QuestionsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}

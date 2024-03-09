/*
 *  Description: This file defines the groups module.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerModule } from '../answer/answer.module';
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
    forwardRef(() => QuestionsModule),
    forwardRef(() => AnswerModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}

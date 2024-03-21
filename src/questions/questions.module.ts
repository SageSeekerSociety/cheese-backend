/*
 *  Description: This file defines the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from '../answer/answer.legacy.entity';
import { AnswerModule } from '../answer/answer.module';
import { AttitudeModule } from '../attitude/attitude.module';
import { AuthModule } from '../auth/auth.module';
import { ConfiguredElasticsearchModule } from '../common/config/elasticsearch.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GroupsModule } from '../groups/groups.module';
import { TopicsModule } from '../topics/topics.module';
import { User } from '../users/users.legacy.entity';
import { UsersModule } from '../users/users.module';
import { QuestionsController } from './questions.controller';
import {
  Question,
  QuestionFollowerRelation,
  QuestionQueryLog,
  QuestionSearchLog,
  QuestionTopicRelation,
} from './questions.legacy.entity';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionTopicRelation,
      QuestionFollowerRelation,
      QuestionQueryLog,
      QuestionSearchLog,
      User,
      Answer,
    ]),
    ConfiguredElasticsearchModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    TopicsModule,
    AttitudeModule,
    forwardRef(() => AnswerModule),
    forwardRef(() => GroupsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

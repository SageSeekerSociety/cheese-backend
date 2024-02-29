/*
 *  Description: This file defines the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfiguredElasticsearchModule } from '../common/config/elasticsearch.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TopicsModule } from '../topics/topics.module';
import { UsersModule } from '../users/users.module';
import { QuestionsController } from './questions.controller';
import {
  InvitationUser,
  Question,
  QuestionFollowerRelation,
  QuestionInvitation,
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
      QuestionInvitation,
      InvitationUser,
    ]),
    ConfiguredElasticsearchModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    TopicsModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

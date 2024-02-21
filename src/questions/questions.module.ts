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
import { PrismaService } from '../common/prisma.service';
import { TopicsModule } from '../topics/topics.module';
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
    ]),
    ConfiguredElasticsearchModule,
    AuthModule,
    UsersModule,
    TopicsModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, PrismaService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

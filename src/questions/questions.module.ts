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
import { Topic } from '../topics/topics.entity';
import { QuestionsController } from './questions.controller';
import { Question, QuestionQueryLog, QuestionTopicRelation } from './questions.entity';
import { QuestionsService } from './questions.service';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Question,
    QuestionTopicRelation,
    QuestionTopicRelation,
    QuestionQueryLog,
    Topic,
    User,
  ]), AuthModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule { }

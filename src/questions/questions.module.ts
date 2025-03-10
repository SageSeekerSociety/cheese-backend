/*
 *  Description: This file defines the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { AnswerModule } from '../answer/answer.module';
import { AttitudeModule } from '../attitude/attitude.module';
import { AuthModule } from '../auth/auth.module';
import { ConfiguredElasticsearchModule } from '../common/config/elasticsearch.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GroupsModule } from '../groups/groups.module';
import { TopicsModule } from '../topics/topics.module';
import { UsersModule } from '../users/users.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    ConfiguredElasticsearchModule,
    PrismaModule,
    AuthModule,
    forwardRef(() => UsersModule),
    TopicsModule,
    forwardRef(() => AttitudeModule),
    forwardRef(() => GroupsModule),
    forwardRef(() => AnswerModule),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

/*
 *  Description: This file defines the topics module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfiguredElasticsearchModule } from '../common/config/elasticsearch.module';
import { User } from '../users/users.legacy.entity';
import { TopicsController } from './topics.controller';
import { Topic, TopicSearchLog } from './topics.legacy.entity';
import { TopicsService } from './topics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Topic, TopicSearchLog]),
    ConfiguredElasticsearchModule,
    AuthModule,
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}

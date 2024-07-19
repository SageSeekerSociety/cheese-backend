/*
 *  Description: This file defines the topics module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfiguredElasticsearchModule } from '../common/config/elasticsearch.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [PrismaModule, ConfiguredElasticsearchModule, AuthModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}

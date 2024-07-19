/*
 *  Description: This file implements the TopicsService class.
 *               It is responsible for the business logic of topics.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Topic } from '@prisma/client';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { TopicDto } from './DTO/topic.dto';
import { TopicAlreadyExistsError, TopicNotFoundError } from './topics.error';
import { TopicElasticsearchDocument } from './topics.es-doc';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async addTopic(topicName: string, userId: number): Promise<TopicDto> {
    if (await this.isTopicNameExists(topicName))
      throw new TopicAlreadyExistsError(topicName);
    const result = await this.prismaService.topic.create({
      data: {
        name: topicName,
        createdById: userId,
      },
    });
    await this.elasticsearchService.index<TopicElasticsearchDocument>({
      index: 'topics',
      document: {
        id: result.id,
        name: result.name,
      },
    });
    return {
      id: result.id,
      name: result.name,
    };
  }

  async searchTopics(
    keywords: string,
    pageStart: number | undefined,
    pageSize: number,
    searcherId: number | undefined,
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[TopicDto[], PageDto]> {
    const timeBegin = Date.now();
    const result = !keywords
      ? { hits: { hits: [] } }
      : await this.elasticsearchService.search<TopicElasticsearchDocument>({
          index: 'topics',
          size: 1000,
          body: {
            query: {
              match: { name: keywords },
            },
          },
        });
    const allData = result.hits.hits
      .filter((h) => h._source != undefined)
      .map((h) => h._source) as TopicElasticsearchDocument[];
    const [data, page] = PageHelper.PageFromAll(
      allData,
      pageStart,
      pageSize,
      (i) => i.id,
      (pageStart) => {
        throw new TopicNotFoundError(pageStart);
      },
    );
    await this.prismaService.topicSearchLog.create({
      data: {
        keywords: keywords,
        firstTopicId: pageStart,
        pageSize: pageSize,
        result: data.map((t) => t.id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId: searcherId,
        ip: ip,
        userAgent: userAgent,
      },
    });
    return [data, page];
  }

  async findTopicRecordOrThrow(topicId: number): Promise<Topic> {
    const topic = await this.prismaService.topic.findUnique({
      where: {
        id: topicId,
      },
    });
    if (topic == undefined) throw new TopicNotFoundError(topicId);
    return topic;
  }

  async getTopicDtoById(
    topicId: number,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    viewerId: number | undefined,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    ip: string,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    userAgent: string | undefined,
  ): Promise<TopicDto> {
    const topic = await this.findTopicRecordOrThrow(topicId);
    return {
      id: topic.id,
      name: topic.name,
    };
  }

  async isTopicExists(topicId: number): Promise<boolean> {
    const count = await this.prismaService.topic.count({
      where: {
        id: topicId,
      },
    });
    return count > 0;
  }

  async isTopicNameExists(topicName: string): Promise<boolean> {
    const count = await this.prismaService.topic.count({
      where: {
        name: topicName,
      },
    });
    return count > 0;
  }
}

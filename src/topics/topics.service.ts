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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { TopicDto } from './DTO/topic.dto';
import { TopicAlreadyExistsError, TopicNotFoundError } from './topics.error';
import { TopicElasticsearchDocument } from './topics.es-doc';
import { Topic, TopicSearchLog } from './topics.legacy.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicSearchLog)
    private readonly topicSearchLogRepository: Repository<TopicSearchLog>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async addTopic(topicName: string, userId: number): Promise<TopicDto> {
    if (await this.topicRepository.findOneBy({ name: topicName }))
      throw new TopicAlreadyExistsError(topicName);
    const topic = this.topicRepository.create({
      name: topicName,
      createdById: userId,
    });
    const topicSaved = await this.topicRepository.save(topic);
    await this.elasticsearchService.index<TopicElasticsearchDocument>({
      index: 'topics',
      document: {
        id: topicSaved.id,
        name: topicSaved.name,
      },
    });
    return {
      id: topicSaved.id,
      name: topicSaved.name,
    };
  }

  async searchTopics(
    keywords: string,
    pageStart: number | undefined,
    pageSize: number,
    searcherId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<[TopicDto[], PageRespondDto]> {
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
    const log = this.topicSearchLogRepository.create({
      keywords: keywords,
      firstTopicId: pageStart,
      pageSize: pageSize,
      result: data.map((t) => t.id).join(','),
      duration: (Date.now() - timeBegin) / 1000,
      searcherId: searcherId,
      ip: ip,
      userAgent: userAgent,
    });
    await this.topicSearchLogRepository.save(log);
    return [data, page];
  }

  async getTopicDtoById(
    topicId: number,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    viewerId?: number,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    ip?: string,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    userAgent?: string,
  ): Promise<TopicDto> {
    const topic = await this.topicRepository.findOneBy({ id: topicId });
    if (topic == undefined) throw new TopicNotFoundError(topicId);
    return {
      id: topic.id,
      name: topic.name,
    };
  }

  async isTopicExists(topicId: number): Promise<boolean> {
    return (await this.topicRepository.findOneBy({ id: topicId })) != undefined;
  }
}

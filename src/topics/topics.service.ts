/*
 *  Description: This file implements the TopicsService class.
 *               It is responsible for the business logic of topics.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { TopicDto } from './DTO/topic.dto';
import { TopicAlreadyExistsError, TopicNotFoundError } from './topics.error';
import { Topic, TopicSearchLog } from './topics.legacy.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicSearchLog)
    private readonly topicSearchLogRepository: Repository<TopicSearchLog>,
  ) {}

  async addTopic(topicName: string, userId: number): Promise<TopicDto> {
    if (await this.topicRepository.findOneBy({ name: topicName }))
      throw new TopicAlreadyExistsError(topicName);
    const topic = this.topicRepository.create({
      name: topicName,
      createdById: userId,
    });
    const topicSaved = await this.topicRepository.save(topic);
    return {
      id: topicSaved.id,
      name: topicSaved.name,
    };
  }

  async searchTopics(
    keywords: string,
    pageStart: number, // undefined if from start
    pageSize: number,
    searcherId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ): Promise<[TopicDto[], PageRespondDto]> {
    const timeBegin = Date.now();
    const allData = await this.topicRepository
      .createQueryBuilder('topic')
      .select([
        'topic.id',
        'topic.name',
        'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
      ])
      .where('MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE)')
      .orderBy({ relevance: 'DESC', id: 'ASC' })
      .limit(1000)
      .setParameter('keywords', keywords)
      .getMany();
    const [data, page] = PageHelper.PageFromAll(
      allData,
      pageStart,
      pageSize,
      (i) => i.id,
      () => {
        throw new TopicNotFoundError(pageStart);
      },
    );
    if (searcherId != undefined || ip != undefined || userAgent != undefined) {
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
    }
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

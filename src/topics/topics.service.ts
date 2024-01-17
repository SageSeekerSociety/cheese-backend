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
import { Topic, TopicSearchLog } from './topics.entity';
import { TopicAlreadyExistsError, TopicNotFoundError } from './topics.error';

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
    firstTopicId: number, // null if from start
    pageSize: number,
    searcherId: number, // nullable
    ip: string,
    userAgent: string,
  ): Promise<[TopicDto[], PageRespondDto]> {
    const timeBegin = Date.now();
    if (firstTopicId == null) {
      const topics = await this.topicRepository
        .createQueryBuilder('topic')
        // TopicDto contains only id and name.
        // 'relevance' is used for sorting
        .select([
          'topic.id',
          'topic.name',
          'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        // TypeORM uses query template to prevent SQL injection.
        // ':keywords' is translated to a parameter placeholder in the SQL query template,
        // so it cannot be injected.
        .where(
          'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE)',
        )
        .orderBy({ relevance: 'DESC', id: 'ASC' })
        .limit(pageSize + 1)
        .setParameter('keywords', keywords)
        .getMany();
      const log = this.topicSearchLogRepository.create({
        keywords: keywords,
        firstTopicId: firstTopicId,
        pageSize: pageSize,
        result: topics.map((t) => t.id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId: searcherId,
        ip: ip,
        userAgent: userAgent,
      });
      await this.topicSearchLogRepository.save(log);
      return PageHelper.PageStart(topics, pageSize, (t) => t.id);
    } else {
      const relevanceCursorRaw = await this.topicRepository
        .createQueryBuilder('topic')
        .select([
          'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where('id = :firstTopicId', { keywords, firstTopicId })
        .getRawOne();
      if (relevanceCursorRaw == null)
        throw new TopicNotFoundError(firstTopicId);
      const relevanceCursor = relevanceCursorRaw.relevance as number;
      const prevPromise = this.topicRepository
        .createQueryBuilder('topic')
        .select([
          'topic.id',
          'topic.name',
          'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where(
          'ROUND(MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) > ROUND(:relevanceCursor, 5)',
        )
        .orWhere(
          'ROUND(MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) = ROUND(:relevanceCursor, 5)' +
            ' AND topic.id < :firstTopicId',
        )
        .orderBy({ relevance: 'ASC', id: 'DESC' })
        .limit(pageSize)
        .setParameter('keywords', keywords)
        .setParameter('relevanceCursor', relevanceCursor)
        .setParameter('firstTopicId', firstTopicId)
        .getMany();
      const herePromise = this.topicRepository
        .createQueryBuilder('topic')
        .select([
          'topic.id',
          'topic.name',
          'MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE) AS relevance',
        ])
        .where(
          'ROUND(MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) < ROUND(:relevanceCursor, 5)',
        )
        .orWhere(
          'ROUND(MATCH (topic.name) AGAINST (:keywords IN NATURAL LANGUAGE MODE), 5) = ROUND(:relevanceCursor, 5)' +
            ' AND topic.id >= :firstTopicId',
        )
        .orderBy({ relevance: 'DESC', id: 'ASC' })
        .limit(pageSize + 1)
        .setParameter('keywords', keywords)
        .setParameter('relevanceCursor', relevanceCursor)
        .setParameter('firstTopicId', firstTopicId)
        .getMany();
      const [prev, here] = await Promise.all([prevPromise, herePromise]);
      const log = this.topicSearchLogRepository.create({
        keywords: keywords,
        firstTopicId: firstTopicId,
        pageSize: pageSize,
        result: here.map((t) => t.id).join(','),
        duration: (Date.now() - timeBegin) / 1000,
        searcherId: searcherId,
        ip: ip,
        userAgent: userAgent,
      });
      await this.topicSearchLogRepository.save(log);
      return PageHelper.Page(
        prev,
        here,
        pageSize,
        (i) => i.id,
        (i) => i.id,
      );
    }
  }
}

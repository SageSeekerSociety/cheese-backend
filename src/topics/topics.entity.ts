/*
 *  Description: This file defines the entities used in topics service.
 *               It defines the SQL tables stored in the database.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { isMySql } from '../common/helper/db.helper';
import { User } from '../users/users.entity';

@Entity()
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ fulltext: true, parser: 'ngram' }) // For fulltext search.
  @Index('idx_name_uniqueness', { unique: true }) // For uniqueness.
  name: string;

  @ManyToOne(() => User)
  @Index()
  createdBy: User;

  // This property does not generate a new column, because the column `createdById` is
  // generated automatically according to the @ManyToOne decorator by TypeORM engine.
  //
  // This property is used for accessing the user id without joining the user table.
  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
// The search history is a precious data source,
// so we should record it even if it is not used for now.
export class TopicSearchLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  // In the future, we may want to use the search history to recommend topics to users.
  // So we use fulltext index here, although it is not necessary for now.
  @Index({ fulltext: true, parser: 'ngram' })
  keywords: string;

  @Column({ nullable: true })
  // A paging argument.
  firstTopicId: number;

  @Column()
  // A paging argument.
  pageSize: number;

  @Column()
  // The result is represented as a string of topic ids, separated by comma.
  // For example, if the result is [1, 2, 3], then the result string is "1,2,3".
  result: string;

  @Column({ type: isMySql() ? 'double' : 'float' })
  // The search duration in seconds.
  duration: number;

  @ManyToOne(() => User)
  @Index()
  searcher: User;

  // This property does not generate a new column, because the column `searcherId` is
  // generated automatically according to the @ManyToOne decorator by TypeORM engine.
  //
  // This property is used for accessing the user id without joining the user table.
  //
  // Null if the searcher is not logged in.
  @Column({ nullable: true })
  searcherId: number;

  @Column()
  ip: string;

  @Column()
  userAgent: string = '';

  @CreateDateColumn()
  createdAt: Date;
}

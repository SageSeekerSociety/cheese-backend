/*
 *  Description: This file defines the entities used in questions service.
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
  UpdateDateColumn,
} from 'typeorm';
import { Topic } from '../topics/topics.entity';
import { User } from '../users/users.entity';

@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  askerUser: User;

  @Column()
  @Index('idx_asker_user', { unique: false })
  askerUserId: number;

  // Use column type 'text' to support arbitrary length of string.
  @Column('text')
  // Use fulltext index to support fulltext search.
  @Index('idx_ft_title', { fulltext: true, parser: 'ngram' })
  title: string;

  // Use column type 'text' to support arbitrary length of string.
  @Column('text')
  // Use fulltext index to support fulltext search.
  @Index('idx_ft_content', { fulltext: true, parser: 'ngram' })
  content: string;

  @Column()
  type: number;

  @Column({ nullable: true })
  @Index('idx_group', { unique: false })
  groupId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

@Entity()
export class QuestionTopicRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Question)
  question: Question;

  @Column()
  @Index('idx_question', { unique: false })
  questionId: number;

  @ManyToOne(() => Topic)
  topic: Topic;

  @Column()
  @Index('idx_topic', { unique: false })
  topicId: number;

  // In the future, we may want to add a feature to add a topic to a question.
  // So we reserved this field.
  @ManyToOne(() => User)
  createdBy: User;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

@Entity()
export class QuestionFollowerRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Question)
  question: Question;

  @Column()
  @Index('idx_question', { unique: false })
  questionId: number;

  @ManyToOne(() => User)
  follower: User;

  @Column()
  @Index('idx_follower', { unique: false })
  followerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

@Entity()
export class QuestionQueryLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  viewer: User;

  @Column({ nullable: true })
  @Index('idx_user', { unique: false })
  viewerId: number;

  @ManyToOne(() => Question)
  question: Question;

  @Column()
  @Index('idx_question', { unique: false })
  questionId: number;

  @Column()
  ip: string;

  @Column()
  userAgent: string = '';

  @CreateDateColumn()
  createdAt: Date;
}

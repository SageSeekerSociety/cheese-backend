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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: false })
  askerUserId: number;

  // Use column type 'text' to support arbitrary length of string.
  @Column('text')
  // Use fulltext index to support fulltext search.
  @Index({ fulltext: true, parser: 'ngram' })
  title: string;

  // Use column type 'text' to support arbitrary length of string.
  @Column('text')
  // Use fulltext index to support fulltext search.
  @Index({ fulltext: true, parser: 'ngram' })
  content: string;

  @Column()
  type: number;

  @Column({ nullable: true })
  @Index({ unique: false })
  groupId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

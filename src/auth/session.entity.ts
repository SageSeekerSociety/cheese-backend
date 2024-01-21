/*
 *  Description: This file defines the database entities used for session.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  // If now > validUntil, the session is invalid.
  @Column()
  @Index()
  validUntil: Date;

  // If revoked == true, the session is invalid.
  @Column()
  revoked: boolean = false;

  // We can use this column to select all sessions of a user.
  @Column()
  @Index()
  userId: number;

  // JSON of Authorization object
  // It might be lengthy, so we uses "text",
  // which has no length limit.
  @Column('text')
  authorization: string;

  @Column()
  lastRefreshedAt: Date = new Date(0);

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class SessionRefreshLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @Column('text')
  refreshToken: string;

  @Column('text')
  accessToken: string;

  @CreateDateColumn()
  createdAt: Date;
}

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

  // If the sign time of a refreshToken < lastRefreshedAt,
  // the refreshToken is invalid.
  //
  // This means that a refreshToken can only be used once.
  //
  // This column is stored as integer timestamp, because
  // database does not support millisecond precision.
  // int32 is not enough, so we use int64.
  @Column('bigint')
  lastRefreshedAt: number;

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
  oldRefreshToken: string;

  @Column('text')
  newRefreshToken: string;

  @Column('text')
  accessToken: string;

  @CreateDateColumn()
  createdAt: Date;
}

/*
 *  DO NOT MODIFY THIS FILE!
 *
 *  TypeORM is deprecated in this project, and we use Prisma instead.
 *  This file is only used by legacy code.
 *
 *  A .legacy.prisma file with same schema is generated by Prisma.
 *  If you modify this file, the schema in .legacy.prisma will be inconsistent
 *  with this file. This may cause unexpected errors.
 *
 *  Also, because TypeORM will alter the database schema automatically if
 *  'syncronize' is set to true, modifying this file is extremely dangerous.
 *
 *  2024-02-19 by Nictheboy <nictheboy@outlook.com>
 *
 */

/*
 *  Description: This file defines the entities used in groups service.
 *               It defines the SQL tables stored in the database.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from '../questions/questions.legacy.entity';
import { User } from '../users/users.legacy.entity';
import { GroupProfile } from './group-profile.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  name: string;

  @OneToOne(() => GroupProfile, (profile) => profile.group, {
    cascade: ['soft-remove'],
  })
  profile: GroupProfile;

  @OneToMany(() => GroupMembership, (membership) => membership.group)
  memberships: GroupMembership[];

  @CreateDateColumn({
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class GroupMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group, (group) => group.memberships)
  @Index()
  group: Group;

  @Column()
  groupId: number;

  @ManyToOne(() => User)
  @Index()
  member: User;

  @Column()
  memberId: number;

  @Column()
  role: string; // todo: enum

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class GroupQuestionRelationship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group)
  @Index()
  group: Group;

  @Column()
  groupId: number;

  @OneToOne(() => Question, (question) => question.groupQuestionRelationship)
  @JoinColumn()
  question: Question;

  @Column()
  questionId: number;

  @Column()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

export enum GroupAttendanceFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

@Entity()
export class GroupTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group) // todo: Is it possible to use @OneToOne here?
  @Index()
  group: Group;

  @Column()
  groupId: number;

  @Column()
  name: string;

  @Column()
  intro: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'date' })
  startedAt: Date;

  @Column({ type: 'date' })
  endedAt: Date;

  @Column()
  attendanceFrequency: GroupAttendanceFrequency;
}
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
import { Question } from '../questions/questions.entity';
import { User } from '../users/users.entity';
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

  @CreateDateColumn()
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

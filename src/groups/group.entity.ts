import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  name: string;

  @Column()
  owner: User;

  @Column()
  ownerId: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @Column()
  deletedAt?: Date;
}

@Entity()
export class GroupProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Group)
  @Index({ unique: true })
  @JoinColumn()
  group: Group; // This links the profile to the corresponding group

  @Column()
  intro: string;

  @Column()
  membersCount: number;

  @Column()
  questionsCount: number;

  @Column()
  answersCount: number;

  @Column()
  avatar: string; // Group image or avatar

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group)
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
  role: string;

  @CreateDateColumn()
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
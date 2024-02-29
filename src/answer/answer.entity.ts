import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from '../groups/groups.legacy.entity';
import { Question } from '../questions/questions.legacy.entity';
import { User } from '../users/users.legacy.entity';
import { AnswerAttitudeUndefined } from './answer.service';

@Entity()
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  author: User;

  @Column()
  @Index({ unique: false })
  authorId: number;

  @ManyToOne(() => Question)
  question: Question;

  @Column()
  @Index({ unique: false })
  questionId: number; //askeruser_Id

  @ManyToOne(() => Group)
  group: Group;

  @Column({ nullable: true })
  @Index({ unique: false })
  groupId?: number;

  // Use column type 'text' to support arbitrary length of string.
  @Column('text')
  content: string;

  @OneToMany(() => AnswerUserAttitude, (attitude) => attitude.answer)
  attitudes: AnswerUserAttitude[];

  @ManyToMany(() => User)
  @JoinTable()
  favoritedBy: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class AnswerUserAttitude {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Answer, (answer) => answer.attitudes)
  answer: Answer;

  @Column()
  answerId: number;

  @Column({ default: AnswerAttitudeUndefined })
  type: number;
}

// export enum AttitudeType {
//   Agree = 1,
//   Disagree = 2,
// }

@Entity()
export class AnswerQueryLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @Index()
  viewer: User;

  @Column('int', { nullable: true })
  viewerId?: number | null;

  @ManyToOne(() => Answer)
  @Index()
  answer: Answer;

  @Column('int')
  answerId: number;

  @Column()
  ip: string;

  @Column()
  userAgent: string = '';

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class AnswerUpdateLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @Index()
  updater: User;

  @Column('int', { nullable: true })
  updaterId?: number | null;

  @ManyToOne(() => Answer)
  @Index()
  answer: Answer;

  @Column('int')
  answerId: number;

  @Column('text')
  oldContent: string; // The content before update.

  @Column('text')
  newContent: string; // The content after update.

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class AnswerDeleteLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @Index()
  deleter: User;

  @Column('int', { nullable: true })
  deleterId?: number | null;

  @ManyToOne(() => Answer)
  @Index()
  answer: Answer;

  @Column('int')
  answerId: number;

  @CreateDateColumn()
  createdAt: Date;
}

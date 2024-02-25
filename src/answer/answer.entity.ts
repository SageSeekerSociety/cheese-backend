import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId'})
  author: User;

  @Column()
  userId: number;

  @Column()
  @Index({ unique: false })
  question_Id: number; //askeruser_Id

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

  // @Column()
  // type: Answer;

  @Column()
  is_group: boolean;

  @Column({ nullable: true })
  @Index({ unique: false })
  groupId?: number;

  @OneToMany(() => UserAttitudeOnAnswer, (attitude) => attitude.type)
  attitudes: UserAttitudeOnAnswer[];

  @ManyToMany(() => User)
  @JoinTable()
  favoritedBy: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

@Entity()
export class UserAttitudeOnAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @JoinColumn()
  answer: Answer;

  @Column()
  answerId: number;

  @Column()
  type: AttitudeType;
}

export enum AttitudeType {
  Agree,
  Disagree,
}

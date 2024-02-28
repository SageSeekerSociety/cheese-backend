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
import { User } from '../users/users.legacy.entity';

@Entity()
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  author: User;

  @Column()
  userId: number;

  @Column()
  @Index({ unique: false })
  questionId: number; //askeruser_Id

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

  @OneToMany(() => UserAttitudeOnAnswer, (attitude) => attitude.answer, {
    cascade: true,
  })
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

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Answer, (answer) => answer.attitudes, {
    onDelete: 'CASCADE',
  })
  answer: Answer;

  @Column()
  answerId: number;

  @Column({ default: 0 })
  type: number;
}

// export enum AttitudeType {
//   Agree = 1,
//   Disagree = 2,
// }

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Answer } from '../answer/answer.entity'; // 假设您有一个名为 Question 的实体用于表示问题
import { User } from '../users/users.entity';
import { UserDto } from '../users/DTO/user.dto';
import { QuestionDto } from '../questions/DTO/question.dto';
import { Question } from '../questions/questions.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number; //自己的id

  @Column()
  content: string; //内容

  @Column()
  commentableId: number; //评论对象的id

  @Column()
  commentableType: string; //评论对象的类型

  @Column()
  agreecount: number; //认同数目

  @Column()
  disagreecount: number; //不认同数目

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' }) // 假设您在 Comment 表中有一个名为 user_id 的外键列
  user: UserDto;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  subComments: Comment[];

  @ManyToOne(() => Comment, (comment) => comment.subComments)
  parentComment: Comment;

  @ManyToOne(() => CommentAnswerShip, (AnswerShip) => AnswerShip.comments)
  AnswerShips: CommentAnswerShip;

  @ManyToOne(() => CommentQuestionShip, (QuestionShip) => QuestionShip.comments)
  QuestionShips: CommentQuestionShip;

  @OneToOne(() => CommentMemberShip, (membership) => membership.comment)
  membership: CommentMemberShip;

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
export class CommentMemberShip {
  @PrimaryGeneratedColumn()
  id: number; //这个关系的id

  @OneToOne(() => User)
  @JoinColumn({ name: 'member_id' })
  member: User;

  @OneToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class CommentAnswerShip {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Comment, (comment) => comment.AnswerShips)
  @JoinColumn({ name: 'comment_id' })
  comments: Comment[];

  @ManyToOne(() => Answer)
  @JoinColumn({ name: 'answer_id' })
  answer: Answer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

export class CommentQuestionShip {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Comment, (comment) => comment.QuestionShips)
  @JoinColumn({ name: 'comment_id' }) // 假设您在 CommentQuestionShip 表中有一个名为 question_id 的外键列
  comments: Comment[];

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' }) // 假设您在 CommentQuestionShip 表中有一个名为 question_id 的外键列
  question: QuestionDto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;
}

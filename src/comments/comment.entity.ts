import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Answer } from '../answer/answer.entity';
import { Question } from '../questions/questions.entity';
import { UserDto } from '../users/DTO/user.dto';
import { User } from '../users/users.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  content: string;

  @Column()
  commentableId: number;

  @Column()
  commentableType: 'answer' | 'comment' | 'question';

  @Column()
  quote_id: number | undefined;

  @Column()
  quote_user: UserDto | undefined;

  @Column()
  agreeType: number;

  @Column()
  agreecount: number;

  @Column()
  disagreecount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: UserDto;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  subComments: Comment[];

  @ManyToOne(() => Comment, (comment) => comment.subComments)
  parentComment: Comment;

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
  id: number;

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
export class CommentRelationship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  commentableId: number;

  @Column()
  commentableType: 'answer' | 'comment' | 'question';

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => Question, { nullable: true })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Answer, { nullable: true })
  @JoinColumn({ name: 'answer_id' })
  answer: Answer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'answer_id' })
  answerId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote: Comment;

  @Column()
  content: string;

  @Column({ name: 'agree_type' })
  agreeType: number;

  @Column({ name: 'agree_count' })
  agreeCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}

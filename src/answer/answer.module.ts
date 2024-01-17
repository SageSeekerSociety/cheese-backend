import { Module } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { AnswerController } from './answer.controller';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Module({
  providers: [AnswerService],
  controllers: [AnswerController]
})
export class AnswerModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column()
  authorId: number;

  // 其他属性
}

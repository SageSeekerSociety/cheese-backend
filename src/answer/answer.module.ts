import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entity } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { User } from '../users/users.legacy.entity';
import { UsersModule } from '../users/users.module';
import { AnswerController } from './answer.controller';
import {
  Answer,
  AnswerDeleteLog,
  AnswerQueryLog,
  AnswerUpdateLog,
  AnswerUserAttitude,
} from './answer.legacy.entity';
import { AnswerService } from './answer.service';

@Entity()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Answer,
      AnswerUserAttitude,
      AnswerQueryLog,
      AnswerUpdateLog,
      AnswerDeleteLog,
      User,
    ]),
    AuthModule,
    UsersModule,
    QuestionsModule,
  ],
  providers: [AnswerService],
  controllers: [AnswerController],
})
export class AnswerModule {}

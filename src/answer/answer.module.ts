import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';
import { AnswerController } from './answer.controller';
import { Answer } from './answer.entity';
import { AnswerService } from './answer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Answer]),
    AuthModule,
    UsersModule,
    QuestionsModule
  ],
  providers: [AnswerService],
  controllers: [AnswerController],
})
export class AnswerModule {
}

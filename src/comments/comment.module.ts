import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from '../answer/answer.entity';
import { AnswerModule } from '../answer/answer.module';
import { AuthModule } from '../auth/auth.module';
import { Question } from '../questions/questions.legacy.entity';
import { QuestionsModule } from '../questions/questions.module';
import { User } from '../users/users.legacy.entity';
import { UsersModule } from '../users/users.module';
import { CommentsController } from './comment.controller';
import { Comment, UserAttitudeOnComments } from './comment.entity';
import { CommentsService } from './comment.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Comment,
      Answer,
      Question,
      User,
      UserAttitudeOnComments,
    ]),
    AuthModule,
    UsersModule,
    QuestionsModule,
    AnswerModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

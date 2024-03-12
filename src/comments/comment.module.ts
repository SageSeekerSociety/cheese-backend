import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerModule } from '../answer/answer.module';
import { AttitudeModule } from '../attitude/attitude.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';
import { CommentsController } from './comment.controller';
import {
  Comment,
  CommentDeleteLog,
  CommentQueryLog,
} from './comment.legacy.entity';
import { CommentsService } from './comment.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentDeleteLog, CommentQueryLog]),
    AuthModule,
    UsersModule,
    QuestionsModule,
    AnswerModule,
    AttitudeModule,
    PrismaModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

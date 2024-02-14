import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { QuestionsModule } from '../questions/questions.module';
import { Comment } from './comment.entity';
import { CommentMemberShip, CommentAnswerShip } from './comment.entity';
import { CommentsController } from './comment.controller';
import { CommentsService } from './comment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentMemberShip, CommentAnswerShip]),
    AuthModule,
    UsersModule,
    QuestionsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

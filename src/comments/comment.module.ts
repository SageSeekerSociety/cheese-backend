import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { QuestionsModule } from '../questions/questions.module';
import { Comment } from './comment.entity'; // 导入你的 Comment 实体
import { CommentMemberShip, CommentAnswerShip } from './comment.entity'; // 导入你的 CommentMembership 和 CommentAnswerShip 实体
import { CommentsController } from './comment.controller'; // 导入你的 CommentsController
import { CommentsService } from './comment.service'; // 导入你的 CommentsService

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

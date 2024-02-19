import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';
import { CommentsController } from './comment.controller';
import { Comment, CommentMemberShip } from './comment.entity';
import { CommentsService } from './comment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentMemberShip]),
    AuthModule,
    UsersModule,
    QuestionsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comments.controller';
import { Comment } from './comments.entity';
import { CommentService } from './comments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule { }


import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttitudeModule } from '../attitude/attitude.module';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comment.module';
import { GroupsModule } from '../groups/groups.module';
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
    forwardRef(() => UsersModule),
    forwardRef(() => QuestionsModule),
    forwardRef(() => CommentsModule),
    forwardRef(() => GroupsModule),
    AttitudeModule,
  ],
  providers: [AnswerService],
  controllers: [AnswerController],
  exports: [AnswerService],
})
export class AnswerModule {}

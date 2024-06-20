import { Module, forwardRef } from '@nestjs/common';
import { AnswerModule } from '../answer/answer.module';
import { AttitudeModule } from '../attitude/attitude.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';
import { CommentsController } from './comment.controller';
import { CommentsService } from './comment.service';
@Module({
  imports: [
    AuthModule,
    UsersModule,
    QuestionsModule,
    forwardRef(() => AnswerModule),
    AttitudeModule,
    PrismaModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

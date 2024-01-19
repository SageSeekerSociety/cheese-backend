import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}

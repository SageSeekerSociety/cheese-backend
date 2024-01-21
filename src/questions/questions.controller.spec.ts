import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

describe('QuestionsController', () => {
  let questionsController: QuestionsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [QuestionsService],
    }).compile();

    questionsController = app.get<QuestionsController>(QuestionsController);
  });

  describe('/questions/hello', () => {
    it('should return "Hello World!"', () => {
      expect(questionsController.getHello()).toBe('Hello World!');
    });
  });
});

/*
 *  Description: This file tests the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { TopicsService } from '../topics/topics.service';
import { UsersService } from '../users/users.service';
import { QuestionsService } from './questions.service';
jest.setTimeout(60000);

describe('Questions Module', () => {
  const randomString = Math.floor(Math.random() * 10000000000).toString();
  let app: TestingModule;
  let questionsService: QuestionsService;
  let topicsService: TopicsService;
  let usersService: UsersService;
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    questionsService = app.get<QuestionsService>(QuestionsService);
    topicsService = app.get<TopicsService>(TopicsService);
    usersService = app.get<UsersService>(UsersService);
  });
  afterAll(async () => {
    await app.close();
  });

  it('should wait until user with id 1 exists', async () => {
    while (true) {
      try {
        await usersService.getUserDtoById(1, null, '', '');
      } catch (e) {
        // wait one second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      break;
    }
  });

  it('should add topic to question', async () => {
    const topicId1 = (await topicsService.addTopic(randomString + ' unit test topic 1', 1)).id;
    const topicId2 = (await topicsService.addTopic(randomString + ' unit test topic 2', 1)).id;
    const questionId = await questionsService.addQuestion(
      1,
      'unit test question',
      'unit test question description',
      0,
      [topicId1],
    );
    const questionDto1 = await questionsService.getQuestionDto(
      questionId,
      null,
      '',
      '',
    );
    expect(questionDto1.topics.length).toBe(1);
    expect(questionDto1.topics).toContainEqual({
      id: topicId1,
      name: `${randomString} unit test topic 1`,
    });
    await questionsService.addTopicToQuestion(questionId, topicId2, 1);
    const questionDto2 = await questionsService.getQuestionDto(
      questionId,
      null,
      '',
      '',
    );
    expect(questionDto2.topics.length).toBe(2);
    expect(questionDto2.topics).toContainEqual({
      id: topicId1,
      name: `${randomString} unit test topic 1`,
    });
    expect(questionDto2.topics).toContainEqual({
      id: topicId2,
      name: `${randomString} unit test topic 2`,
    });
  });
});

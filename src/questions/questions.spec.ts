/*
 *  Description: This file provide additional tests to questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { TopicNotFoundError } from '../topics/topics.error';
import { TopicsService } from '../topics/topics.service';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { QuestionNotFoundError } from './questions.error';
import { QuestionsService } from './questions.service';

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

  let questionId: number;
  let topicId1: number;
  let topicId2: number;

  it('should add topic to question', async () => {
    topicId1 = (
      await topicsService.addTopic(randomString + ' unit test topic 1', 1)
    ).id;
    topicId2 = (
      await topicsService.addTopic(randomString + ' unit test topic 2', 1)
    ).id;
    questionId = await questionsService.addQuestion(
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

  it('should throw UserIdNotFoundError', async () => {
    await expect(
      questionsService.followQuestion(-1, questionId),
    ).rejects.toThrow(new UserIdNotFoundError(-1));
    await expect(
      questionsService.unfollowQuestion(-1, questionId),
    ).rejects.toThrow(new UserIdNotFoundError(-1));
  });

  it('should throw QuestionNotFoundError', async () => {
    await expect(
      questionsService.addTopicToQuestion(-1, topicId1, 1),
    ).rejects.toThrow(new QuestionNotFoundError(-1));
  });

  it('should throw TopicNotFoundError', async () => {
    await expect(
      questionsService.addTopicToQuestion(questionId, -1, 1),
    ).rejects.toThrow(new TopicNotFoundError(-1));
  });

  it('should throw UserIdNotFoundError', async () => {
    await expect(
      questionsService.addTopicToQuestion(questionId, topicId1, -1),
    ).rejects.toThrow(new UserIdNotFoundError(-1));
  });

  it('should throw QuestionNotFoundError', async () => {
    await expect(
      questionsService.updateQuestion(-1, 'title', 'content', 0, []),
    ).rejects.toThrow(new QuestionNotFoundError(-1));
    await expect(questionsService.deleteQuestion(-1)).rejects.toThrow(
      new QuestionNotFoundError(-1),
    );
    await expect(questionsService.unfollowQuestion(1, -1)).rejects.toThrow(
      new QuestionNotFoundError(-1),
    );
  });
});

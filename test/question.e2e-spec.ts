/*
 *  Description: This file tests the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('Questions Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  const TestTopicCode = Math.floor(Math.random() * 10000000000).toString();
  const TestTopicPrefix = `[Test(${TestTopicCode}) Question]`;
  const TestQuestionCode = Math.floor(Math.random() * 10000000000).toString();
  const TestQuestionPrefix = `[Test(${TestQuestionCode}) Question]`;
  let TestToken: string;
  let TestUserId: number;
  const TopicIds: number[] = [];
  const questionIds: number[] = [];
  const answerIds: number[] = [];
  const invitationIds: number[] = [];
  let auxUserId: number;
  let auxAccessToken: string;

  async function createAuxiliaryUser(): Promise<[number, string]> {
    // returns [userId, accessToken]
    const email = `test-${Math.floor(Math.random() * 10000000000)}@ruc.edu.cn`;
    const respond = await request(app.getHttpServer())
      .post('/users/verify/email')
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      .send({ email });
    expect(respond.status).toBe(201);
    const verificationCode = (
      MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
    ).mock.calls.at(-1)[1];
    const respond2 = await request(app.getHttpServer())
      .post('/users')
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      .send({
        username: `TestUser-${Math.floor(Math.random() * 10000000000)}`,
        nickname: 'auxiliary_user',
        password: 'abc123456!!!',
        email,
        emailCode: verificationCode,
      });
    expect(respond2.status).toBe(201);
    return [respond2.body.data.user.id, respond2.body.data.accessToken];
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000);

  beforeEach(() => {
    (
      MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
    ).mock.calls.length = 0;
    (
      MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
    ).mock.results.length = 0;
    (
      MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
    ).mock.calls.length = 0;
    (
      MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
    ).mock.results.length = 0;
  });

  describe('preparation', () => {
    it(`should send an email and register a user ${TestUsername}`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: 'Send email successfully.',
      });
      expect(respond1.status).toBe(201);
      expect(
        MockedEmailService.mock.instances[0].sendRegisterCode,
      ).toHaveReturnedTimes(1);
      expect(
        MockedEmailService.mock.instances[0].sendRegisterCode,
      ).toHaveBeenCalledWith(TestEmail, expect.any(String));
      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: 'abc123456!!!',
          email: TestEmail,
          emailCode: verificationCode,
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual('Register successfully.');
      expect(respond.body.code).toEqual(201);
      req.expect(201);
      expect(respond.body.data.accessToken).toBeDefined();
      TestToken = respond.body.data.accessToken;
      expect(respond.body.data.user.id).toBeDefined();
      TestUserId = respond.body.data.user.id;
    });
    it('should create some topics', async () => {
      async function createTopic(name: string) {
        const respond = await request(app.getHttpServer())
          .post('/topics')
          .set('authorization', 'Bearer ' + TestToken)
          .send({
            name: `${TestTopicPrefix} ${name}`,
          });
        expect(respond.body.message).toBe('OK');
        expect(respond.status).toBe(201);
        expect(respond.body.code).toBe(201);
        TopicIds.push(respond.body.data.id);
      }
      await createTopic('数学');
      await createTopic('哥德巴赫猜想');
      await createTopic('钓鱼');
    }, 60000);
    it('should create an auxiliary user', async () => {
      [auxUserId, auxAccessToken] = await createAuxiliaryUser();
    });
  });

  describe('create question', () => {
    it('should create some questions', async () => {
      async function createQuestion(title: string, content: string) {
        const respond = await request(app.getHttpServer())
          .post('/questions')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({
            title: `${TestQuestionPrefix} ${title}`,
            content,
            type: 0,
            topics: [TopicIds[0], TopicIds[1]],
          });
        expect(respond.body.message).toBe('Created');
        expect(respond.body.code).toBe(201);
        expect(respond.status).toBe(201);
        expect(respond.body.data.id).toBeDefined();
        questionIds.push(respond.body.data.id);
      }
      await createQuestion(
        '我这个哥德巴赫猜想的证明对吗？',
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      await createQuestion('这学期几号放假啊？', '如题');
      await createQuestion(
        '好难受啊',
        '我这学期选了五十学分，每天都要早八，而且还有好多作业要写，好难受啊。安慰安慰我吧。',
      );
      await createQuestion('Question title with emoji: 😂😂', 'content');
      await createQuestion('title', 'Question content with emoji: 😂😂');
      await createQuestion('long question', '啊'.repeat(30000));
    }, 60000);
    it('should return updated statistic info when getting user', async () => {
      const respond = await request(app.getHttpServer()).get(
        `/users/${TestUserId}`,
      );
      expect(respond.body.data.user.question_count).toBe(6);
    });
    it('should return updated statistic info when getting user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}`)
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.data.user.question_count).toBe(6);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [TopicIds[0], TopicIds[1]],
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return TopicNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [-1],
        });
      expect(respond.body.message).toMatch(/^TopicNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
  });

  describe('get question', () => {
    it('should get a question', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.id).toBe(questionIds[0]);
      expect(respond.body.data.question.title).toContain(TestQuestionPrefix);
      expect(respond.body.data.question.content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.question.author.id).toBe(TestUserId);
      expect(respond.body.data.question.author.username).toBe(TestUsername);
      expect(respond.body.data.question.author.nickname).toBe('test_user');
      expect(respond.body.data.question.type).toBe(0);
      expect(respond.body.data.question.topics.length).toBe(2);
      expect(respond.body.data.question.topics[0].name).toContain(
        TestTopicPrefix,
      );
      expect(respond.body.data.question.topics[1].name).toContain(
        TestTopicPrefix,
      );
      expect(respond.body.data.question.created_at).toBeDefined();
      expect(respond.body.data.question.updated_at).toBeDefined();
      expect(respond.body.data.question.attitudes.positive_count).toBe(0);
      expect(respond.body.data.question.attitudes.negative_count).toBe(0);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
      expect(respond.body.data.question.is_follow).toBe(false);
      expect(respond.body.data.question.answer_count).toBe(0);
      expect(respond.body.data.question.comment_count).toBe(0);
      expect(respond.body.data.question.follow_count).toBe(0);
      expect(respond.body.data.question.view_count).toBe(0);
      expect(respond.body.data.question.group).toBe(null);
    }, 20000);
    it('should get a question without token', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[0]}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.id).toBe(questionIds[0]);
      expect(respond.body.data.question.title).toContain(TestQuestionPrefix);
      expect(respond.body.data.question.content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.question.author.id).toBe(TestUserId);
      expect(respond.body.data.question.author.username).toBe(TestUsername);
      expect(respond.body.data.question.author.nickname).toBe('test_user');
      expect(respond.body.data.question.type).toBe(0);
      expect(respond.body.data.question.topics.length).toBe(2);
      expect(respond.body.data.question.topics[0].name).toContain(
        TestTopicPrefix,
      );
      expect(respond.body.data.question.topics[1].name).toContain(
        TestTopicPrefix,
      );
      expect(respond.body.data.question.created_at).toBeDefined();
      expect(respond.body.data.question.updated_at).toBeDefined();
      expect(respond.body.data.question.attitudes.positive_count).toBe(0);
      expect(respond.body.data.question.attitudes.negative_count).toBe(0);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
      expect(respond.body.data.question.is_follow).toBe(false);
      expect(respond.body.data.question.answer_count).toBe(0);
      expect(respond.body.data.question.view_count).toBe(1);
      expect(respond.body.data.question.follow_count).toBe(0);
      expect(respond.body.data.question.comment_count).toBe(0);
      expect(respond.body.data.question.group).toBe(null);
    }, 20000);
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get('/questions/-1')
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
  });

  describe('get questions asked by user', () => {
    it('should return UserIdNotFoundError', async () => {
      const noneExistUserId = -1;
      const respond = await request(app.getHttpServer())
        .get(`/users/${noneExistUserId}/questions`)
        .send();
      expect(respond.body.message).toMatch(/^UserIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
      expect(respond.statusCode).toBe(404);
    });
    it('should get all the questions asked by the user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/questions`)
        .send();
      expect(respond.body.message).toBe('Query asked questions successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(questionIds.length);
      expect(respond.body.data.page.page_start).toBe(questionIds[0]);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
      expect(respond.body.data.questions.length).toBe(questionIds.length);
      expect(respond.body.data.questions[0].id).toBe(questionIds[0]);
      expect(respond.body.data.questions[0].title).toBe(
        `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
      );
      expect(respond.body.data.questions[0].content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.questions[0].author.id).toBe(TestUserId);
      for (let i = 0; i < questionIds.length; i++) {
        expect(respond.body.data.questions[i].id).toBe(questionIds[i]);
      }
    });
    it('should get all the questions asked by the user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/questions`)
        .query({
          page_start: questionIds[1],
          page_size: 1000,
        })
        .send();
      expect(respond.body.message).toBe('Query asked questions successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(questionIds.length - 1);
      expect(respond.body.data.page.page_start).toBe(questionIds[1]);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(questionIds[0]);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
      expect(respond.body.data.questions.length).toBe(questionIds.length - 1);
      for (let i = 1; i < questionIds.length; i++) {
        expect(respond.body.data.questions[i - 1].id).toBe(questionIds[i]);
      }
    });
    it('should get paged questions asked by the user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/questions`)
        .query({
          page_start: questionIds[0],
          page_size: 2,
        })
        .send();
      expect(respond.body.message).toBe('Query asked questions successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(2);
      expect(respond.body.data.page.page_start).toBe(questionIds[0]);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(questionIds[2]);
      expect(respond.body.data.questions.length).toBe(2);
      expect(respond.body.data.questions[0].id).toBe(questionIds[0]);
      expect(respond.body.data.questions[0].title).toBe(
        `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
      );
      expect(respond.body.data.questions[0].content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.questions[0].author.id).toBe(TestUserId);
      expect(respond.body.data.questions[1].id).toBe(questionIds[1]);
    });
    it('should get paged questions asked by the user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/questions`)
        .query({
          page_start: questionIds[2],
          page_size: 2,
        })
        .send();
      expect(respond.body.message).toBe('Query asked questions successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(2);
      expect(respond.body.data.page.page_start).toBe(questionIds[2]);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(questionIds[0]);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(questionIds[4]);
      expect(respond.body.data.questions.length).toBe(2);
      expect(respond.body.data.questions[0].id).toBe(questionIds[2]);
      expect(respond.body.data.questions[1].id).toBe(questionIds[3]);
    });
  });

  describe('search question', () => {
    it('should wait some time for elasticsearch to refresh', async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });
    it('should return empty page without parameters', async () => {
      const respond = await request(app.getHttpServer())
        .get('/questions')
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.questions.length).toBe(0);
      expect(respond.body.data.page.page_size).toBe(0);
      expect(respond.body.data.page.page_start).toBe(0);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
    });
    it('should return empty page without page_size and page_start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions?q=${TestQuestionCode}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.questions.length).toBe(
        respond.body.data.page.page_size,
      );
      expect(questionIds).toContain(respond.body.data.page.page_start);
      expect(respond.body.data.page.page_size).toBeGreaterThanOrEqual(6);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
    });
    it('should search successfully with page_size, with or without page_start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions?q=${TestQuestionCode}&page_size=1`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.questions.length).toBe(1);
      expect(questionIds).toContain(respond.body.data.page.page_start);
      expect(respond.body.data.page.page_size).toBe(1);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(true);
      const next = respond.body.data.page.next_start;
      const respond2 = await request(app.getHttpServer())
        .get(`/questions?q=${TestQuestionCode}&page_size=1&page_start=${next}`)
        .send();
      expect(respond2.body.message).toBe('OK');
      expect(respond2.body.code).toBe(200);
      expect(respond2.status).toBe(200);
      expect(respond2.body.data.questions.length).toBe(1);
      expect(respond2.body.data.page.page_start).toBe(next);
      expect(respond2.body.data.page.page_size).toBe(1);
      expect(respond2.body.data.page.has_prev).toBe(true);
      expect(respond2.body.data.page.prev_start).toBe(
        respond.body.data.page.page_start,
      );
      expect(respond2.body.data.page.has_more).toBe(true);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions?q=${TestQuestionPrefix}&page_size=5&page_start=-1`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });
  });

  describe('update question', () => {
    it('should update a question', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？(flag)`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。(flag)',
          type: 1,
          topics: [TopicIds[2]],
        });
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      const respond2 = await request(app.getHttpServer())
        .get(`/questions/${questionIds[0]}`)
        .send();
      expect(respond2.body.message).toBe('OK');
      expect(respond2.body.code).toBe(200);
      expect(respond2.status).toBe(200);
      expect(respond2.body.data.question.id).toBe(questionIds[0]);
      expect(respond2.body.data.question.title).toContain('flag');
      expect(respond2.body.data.question.content).toContain('flag');
      expect(respond2.body.data.question.type).toBe(1);
      expect(respond2.body.data.question.topics.length).toBe(1);
      expect(respond2.body.data.question.topics[0].id).toBe(TopicIds[2]);
      expect(respond2.body.data.question.topics[0].name).toBe(
        `${TestTopicPrefix} 钓鱼`,
      );
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[0]}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？(flag)`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。(flag)',
          type: 1,
          topics: [TopicIds[2]],
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .put('/questions/-1')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？(flag)`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。(flag)',
          type: 1,
          topics: [TopicIds[2]],
        });
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
    it('should return PermissionDeniedError', async () => {
      Logger.log(`accessToken: ${auxAccessToken}`);
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？(flag)`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。(flag)',
          type: 1,
          topics: [TopicIds[2]],
        });
      expect(respond.body.message).toMatch(/^PermissionDeniedError: /);
      expect(respond.body.code).toBe(403);
    });
  });

  describe('delete question', () => {
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[0]}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .delete('/questions/-1')
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
    it('should return PermissionDeniedError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toMatch(/^PermissionDeniedError: /);
      expect(respond.body.code).toBe(403);
    });
    it('should delete a question', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      const respond2 = await request(app.getHttpServer())
        .get(`/questions/${questionIds[0]}`)
        .send();
      expect(respond2.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond2.body.code).toBe(404);
    });
  });

  describe('follow logic', () => {
    it('should return QuestionNotFollowedYetError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/followers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionNotFollowedYetError: /);
      expect(respond.body.code).toBe(400);
    });
    it('should follow questions', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/followers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(respond.body.data.follow_count).toBe(1);
      const respond2 = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/followers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond2.body.message).toBe('OK');
      expect(respond2.body.code).toBe(201);
      expect(respond2.status).toBe(201);
      expect(respond2.body.data.follow_count).toBe(2);
      const respond3 = await request(app.getHttpServer())
        .post(`/questions/${questionIds[2]}/followers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond3.body.message).toBe('OK');
      expect(respond3.body.code).toBe(201);
      expect(respond3.status).toBe(201);
      expect(respond3.body.data.follow_count).toBe(1);
      const respond4 = await request(app.getHttpServer())
        .post(`/questions/${questionIds[3]}/followers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond4.body.message).toBe('OK');
      expect(respond4.body.code).toBe(201);
      expect(respond4.status).toBe(201);
      expect(respond4.body.data.follow_count).toBe(1);
      const respond5 = await request(app.getHttpServer())
        .post(`/questions/${questionIds[4]}/followers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond5.body.message).toBe('OK');
      expect(respond5.body.code).toBe(201);
      expect(respond5.status).toBe(201);
      expect(respond5.body.data.follow_count).toBe(1);
    });
    it('should get followed questions', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/follow/questions`)
        .send();
      expect(respond.body.message).toBe(
        'Query followed questions successfully.',
      );
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(1);
      expect(respond.body.data.page.page_start).toBe(questionIds[1]);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
      expect(respond.body.data.questions.length).toBe(1);
      expect(respond.body.data.questions[0].id).toBe(questionIds[1]);
    });
    it('should get followed questions', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/follow/questions`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe(
        'Query followed questions successfully.',
      );
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(4);
      expect(respond.body.data.page.page_start).toBe(questionIds[1]);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
      expect(respond.body.data.questions.length).toBe(4);
      expect(respond.body.data.questions[0].id).toBe(questionIds[1]);
      expect(respond.body.data.questions[1].id).toBe(questionIds[2]);
      expect(respond.body.data.questions[2].id).toBe(questionIds[3]);
      expect(respond.body.data.questions[3].id).toBe(questionIds[4]);
    });
    it('should get followed questions', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/follow/questions`)
        .query({
          page_start: questionIds[2],
          page_size: 1000,
        })
        .send();
      expect(respond.body.message).toBe(
        'Query followed questions successfully.',
      );
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(3);
      expect(respond.body.data.page.page_start).toBe(questionIds[2]);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(questionIds[1]);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
      expect(respond.body.data.questions.length).toBe(3);
      expect(respond.body.data.questions[0].id).toBe(questionIds[2]);
      expect(respond.body.data.questions[1].id).toBe(questionIds[3]);
      expect(respond.body.data.questions[2].id).toBe(questionIds[4]);
    });
    it('should get followed questions', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/follow/questions`)
        .query({
          page_start: questionIds[2],
          page_size: 1,
        })
        .send();
      expect(respond.body.message).toBe(
        'Query followed questions successfully.',
      );
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.page.page_size).toBe(1);
      expect(respond.body.data.page.page_start).toBe(questionIds[2]);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(questionIds[1]);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(questionIds[3]);
      expect(respond.body.data.questions.length).toBe(1);
      expect(respond.body.data.questions[0].id).toBe(questionIds[2]);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[0]}/followers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });
    it('should return QuestionAlreadyFollowedError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/followers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionAlreadyFollowedError: /);
      expect(respond.body.code).toBe(400);
    });
    it('should get follower list', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}/followers`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.users.length).toBe(2);
      expect(respond.body.data.page.page_size).toBe(2);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);

      const respond2 = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}/followers?page_size=1`)
        .send();
      expect(respond2.body.message).toBe('OK');
      expect(respond2.body.code).toBe(200);
      expect(respond2.status).toBe(200);
      expect(respond2.body.data.users.length).toBe(1);
      expect(respond2.body.data.users[0].id).toBe(TestUserId);
      expect(respond2.body.data.users[0].username).toBe(TestUsername);
      expect(respond2.body.data.users[0].nickname).toBe('test_user');
      expect(respond2.body.data.page.page_size).toBe(1);
      expect(respond2.body.data.page.has_prev).toBe(false);
      expect(respond2.body.data.page.prev_start).toBe(0);
      expect(respond2.body.data.page.has_more).toBe(true);
      expect(respond2.body.data.page.next_start).toBe(auxUserId);

      const respond3 = await request(app.getHttpServer())
        .get(
          `/questions/${questionIds[1]}/followers?page_size=1&page_start=${TestUserId}`,
        )
        .send();
      expect(respond3.body).toStrictEqual(respond2.body);

      const respond4 = await request(app.getHttpServer())
        .get(
          `/questions/${questionIds[1]}/followers?page_size=1&page_start=${auxUserId}`,
        )
        .send();
      expect(respond4.body.message).toBe('OK');
      expect(respond4.body.code).toBe(200);
      expect(respond4.status).toBe(200);
      expect(respond4.body.data.users.length).toBe(1);
      expect(respond4.body.data.users[0].id).toBe(auxUserId);
      expect(respond4.body.data.page.page_size).toBe(1);
      expect(respond4.body.data.page.has_prev).toBe(true);
      expect(respond4.body.data.page.prev_start).toBe(TestUserId);
      expect(respond4.body.data.page.has_more).toBe(false);
      expect(respond4.body.data.page.next_start).toBe(0);
    });
    it('should unfollow questions', async () => {
      async function unfollow(questionId: number) {
        const respond = await request(app.getHttpServer())
          .delete(`/questions/${questionId}/followers`)
          .set('Authorization', `Bearer ${TestToken}`)
          .send();
        expect(respond.body.message).toBe('OK');
        expect(respond.body.code).toBe(200);
        expect(respond.status).toBe(200);
        expect(respond.body.data.follow_count).toBe(1);
      }
      await unfollow(questionIds[1]);
    });
    it('should return QuestionNotFollowedYetError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/followers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^QuestionNotFollowedYetError: /);
      expect(respond.body.code).toBe(400);
    });
  });

  describe('attitude', () => {
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .send({
          attitude_type: 'POSITIVE',
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should pose positive attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          attitude_type: 'POSITIVE',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(0);
      expect(respond.body.data.attitudes.difference).toBe(1);
      expect(respond.body.data.attitudes.user_attitude).toBe('POSITIVE');
    });
    it('should pose negative attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          attitude_type: 'NEGATIVE',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(1);
      expect(respond.body.data.attitudes.difference).toBe(0);
      expect(respond.body.data.attitudes.user_attitude).toBe('NEGATIVE');
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(1);
      expect(respond.body.data.question.attitudes.negative_count).toBe(1);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(1);
      expect(respond.body.data.question.attitudes.negative_count).toBe(1);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'POSITIVE',
      );
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(1);
      expect(respond.body.data.question.attitudes.negative_count).toBe(1);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'NEGATIVE',
      );
    });
    it('should pose undefined attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          attitude_type: 'UNDEFINED',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(0);
      expect(respond.body.data.attitudes.negative_count).toBe(1);
      expect(respond.body.data.attitudes.difference).toBe(-1);
      expect(respond.body.data.attitudes.user_attitude).toBe('UNDEFINED');
    });
    it('should pose undefined attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          attitude_type: 'UNDEFINED',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(0);
      expect(respond.body.data.attitudes.negative_count).toBe(0);
      expect(respond.body.data.attitudes.difference).toBe(0);
      expect(respond.body.data.attitudes.user_attitude).toBe('UNDEFINED');
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(0);
      expect(respond.body.data.question.attitudes.negative_count).toBe(0);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(0);
      expect(respond.body.data.question.attitudes.negative_count).toBe(0);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
    it('should get modified question attitude statistic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.question.attitudes.positive_count).toBe(0);
      expect(respond.body.data.question.attitudes.negative_count).toBe(0);
      expect(respond.body.data.question.attitudes.difference).toBe(0);
      expect(respond.body.data.question.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });

    // repeat to detect if the database operation has caused some problem
    it('should pose positive attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          attitude_type: 'POSITIVE',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(0);
      expect(respond.body.data.attitudes.difference).toBe(1);
      expect(respond.body.data.attitudes.user_attitude).toBe('POSITIVE');
    });
    it('should pose negative attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/attitudes`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          attitude_type: 'NEGATIVE',
        });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the question',
      );
      expect(respond.statusCode).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(1);
      expect(respond.body.data.attitudes.difference).toBe(0);
      expect(respond.body.data.attitudes.user_attitude).toBe('NEGATIVE');
    });
  });

  describe('invite somebody to answer', () => {
    it('should invite some users to answer question', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: TestUserId });
      expect(respond.body.message).toBe('Invited');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(respond.body.data.invitationId).toBeDefined();
      invitationIds.push(respond.body.data.invitationId);
    });
    it('should invite some users to answer question', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: auxUserId });
      expect(respond.body.message).toBe('Invited');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(respond.body.data.invitationId).toBeDefined();
      invitationIds.push(respond.body.data.invitationId);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .send({ user_id: TestUserId });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return UserIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: 114514 });
      expect(respond.body.message).toContain('UserIdNotFoundError');
      expect(respond.body.code).toBe(404);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/114514/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: TestUserId });
      expect(respond.body.message).toContain('QuestionIdNotFoundError');
      expect(respond.body.code).toBe(404);
    });

    it('should get UserAlreadyInvitedError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: TestUserId });
      expect(respond.body.message).toContain('UserAlreadyInvitedError');
      expect(respond.body.code).toBe(400);
    });
  });
  it('should get invitations', async () => {
    const respond = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .send();
    expect(respond.body.message).toBe('OK');
    expect(respond.body.code).toBe(200);
    expect(respond.status).toBe(200);
    expect(respond.body.data.page.page_size).toBe(2);
    expect(respond.body.data.page.has_prev).toBe(false);
    expect(respond.body.data.page.prev_start).toBe(0);
    expect(respond.body.data.page.has_more).toBe(false);
    expect(respond.body.data.page.next_start).toBe(0);
    expect(respond.body.data.invitations.length).toBe(2);
    expect(respond.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(typeof respond.body.data.invitations[0].id).toBe('number');
    expect(respond.body.data.invitations[0].user).toBeDefined();
    expect(typeof respond.body.data.invitations[0].created_at).toBe('number');
    expect(typeof respond.body.data.invitations[0].updated_at).toBe('number');
    expect(typeof respond.body.data.invitations[0].is_answered).toBe('boolean');
    expect(respond.body.data.invitations[1].question_id).toBe(questionIds[1]);
  });
  it('should get invitations', async () => {
    const respond = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '+created_at',
      })
      .send();
    expect(respond.body.message).toBe('OK');
    expect(respond.body.code).toBe(200);
    expect(respond.status).toBe(200);
    expect(respond.body.data.page.page_size).toBe(2);
    expect(respond.body.data.page.has_prev).toBe(false);
    expect(respond.body.data.page.prev_start).toBe(0);
    expect(respond.body.data.page.has_more).toBe(false);
    expect(respond.body.data.page.next_start).toBe(0);
    expect(respond.body.data.invitations.length).toBe(2);
    expect(respond.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[0].user.id).toBe(TestUserId);
    expect(respond.body.data.invitations[1].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[1].user.id).toBe(auxUserId);
  });
  it('should get invitations', async () => {
    const respond = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '+created_at',
        page_size: 1,
      })
      .send();
    expect(respond.body.message).toBe('OK');
    expect(respond.body.code).toBe(200);
    expect(respond.status).toBe(200);
    expect(respond.body.data.page.page_size).toBe(1);
    expect(respond.body.data.page.has_prev).toBe(false);
    expect(respond.body.data.page.prev_start).toBe(0);
    expect(respond.body.data.page.has_more).toBe(true);
    expect(respond.body.data.invitations.length).toBe(1);
    expect(respond.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[0].user.id).toBe(TestUserId);
    const next = respond.body.data.page.next_start;
    const respond2 = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '+created_at',
        page_start: next,
        page_size: 1,
      })
      .send();
    expect(respond2.body.message).toBe('OK');
    expect(respond2.body.code).toBe(200);
    expect(respond2.status).toBe(200);
    expect(respond2.body.data.page.page_size).toBe(1);
    expect(respond2.body.data.page.has_prev).toBe(true);
    expect(respond2.body.data.page.prev_start).toBe(
      respond.body.data.invitations[0].id,
    );
    expect(respond2.body.data.page.has_more).toBe(false);
    expect(respond2.body.data.invitations.length).toBe(1);
    expect(respond2.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond2.body.data.invitations[0].user.id).toBe(auxUserId);
  });
  it('should get invitations', async () => {
    const respond = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '-created_at',
      })
      .send();
    expect(respond.body.message).toBe('OK');
    expect(respond.body.code).toBe(200);
    expect(respond.status).toBe(200);
    expect(respond.body.data.page.page_size).toBe(2);
    expect(respond.body.data.page.has_prev).toBe(false);
    expect(respond.body.data.page.prev_start).toBe(0);
    expect(respond.body.data.page.has_more).toBe(false);
    expect(respond.body.data.page.next_start).toBe(0);
    expect(respond.body.data.invitations.length).toBe(2);
    expect(respond.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[0].user.id).toBe(auxUserId);
    expect(respond.body.data.invitations[1].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[1].user.id).toBe(TestUserId);
  });
  it('should get invitations', async () => {
    const respond = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '-created_at',
        page_size: 1,
      })
      .send();
    expect(respond.body.message).toBe('OK');
    expect(respond.body.code).toBe(200);
    expect(respond.status).toBe(200);
    expect(respond.body.data.page.page_size).toBe(1);
    expect(respond.body.data.page.has_prev).toBe(false);
    expect(respond.body.data.page.prev_start).toBe(0);
    expect(respond.body.data.page.has_more).toBe(true);
    expect(respond.body.data.invitations.length).toBe(1);
    expect(respond.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond.body.data.invitations[0].user.id).toBe(auxUserId);
    const next = respond.body.data.page.next_start;
    const respond2 = await request(app.getHttpServer())
      .get(`/questions/${questionIds[1]}/invitations`)
      .query({
        sort: '-created_at',
        page_start: next,
        page_size: 1,
      })
      .send();
    expect(respond2.body.message).toBe('OK');
    expect(respond2.body.code).toBe(200);
    expect(respond2.status).toBe(200);
    expect(respond2.body.data.page.page_size).toBe(1);
    expect(respond2.body.data.page.has_prev).toBe(true);
    expect(respond2.body.data.page.prev_start).toBe(
      respond.body.data.invitations[0].id,
    );
    expect(respond2.body.data.page.has_more).toBe(false);
    expect(respond2.body.data.invitations.length).toBe(1);
    expect(respond2.body.data.invitations[0].question_id).toBe(questionIds[1]);
    expect(respond2.body.data.invitations[0].user.id).toBe(TestUserId);
  });
  describe('should deal with the Q&A function', () => {
    it('should answer the question', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/answers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ content: 'woc' });
      expect(respond.body.code).toBe(201);
      answerIds.push(respond.body.data.id);
    });

    it('should return alreadyAnsweredError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/questions/${questionIds[1]}/invitations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ user_id: TestUserId });
      expect(respond.body.message).toContain('AlreadyAnswered');
      expect(respond.body.code).toBe(400);
    });
  });
  describe('it will cancel the invitations', () => {
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/invitations/${invitationIds[0]}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should cancel the invitations', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/invitations/${invitationIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('successfully cancelled');
      expect(respond.body.code).toBe(204);
      expect(respond.status).toBe(200);
    });
    it('should successfully cancel the invitation', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/invitations/${invitationIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(
        /^QuestionInvitationIdNotFoundError: /,
      );
      expect(respond.body.code).toBe(400);
      expect(respond.status).toBe(400);
    });
    it('should return QuestionInvitationIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionIds[1]}/invitations/1919818`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(
        /^QuestionInvitationIdNotFoundError: /,
      );
      expect(respond.body.code).toBe(400);
      expect(respond.status).toBe(400);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const questionId = 1234567;
      const respond = await request(app.getHttpServer())
        .delete(`/questions/${questionId}/invitations/${invitationIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toContain('QuestionIdNotFoundError');
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });
  });
  describe('it may get some details', () => {
    it('should get some details', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}/invitations/${invitationIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.data.invitation.question_id).toBe(questionIds[1]);
      expect(respond.body.data.invitation.id).toBe(invitationIds[1]);
      expect(respond.body.code).toBe(200);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const questionId = 1234567;
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionId}/invitations/${invitationIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toContain('QuestionIdNotFoundError');
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });
    it('should return QuestionInvitationIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}/invitations/${invitationIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(respond.body.message).toContain(
        'QuestionInvitationIdNotFoundError',
      );
      expect(respond.body.code).toBe(400);
      expect(respond.status).toBe(400);
    });
  });

  describe('get recommendation function test', () => {
    it('should get recommendation', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}/invitations/recommendations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ pageSize: 5 });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.users.length).toBe(5);
    });
    it('should return QuestionIdNotFoundEroor', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/1919810/invitations/recommendations`)
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ pageSize: 5 });
      expect(respond.body.message).toContain('QuestionIdNotFoundError');
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
  });

  describe('Bounty test', () => {
    it('should set bounty to a question', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/bounty`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ bounty: 15 });
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
    });
    it('should get the change', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.data.question.bounty).toBe(15);
    });
    it('should return LowerBountyError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/bounty`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ bounty: 10 });
      expect(respond.body.message).toMatch(/^BountyNotBiggerError: /);
      expect(respond.body.code).toBe(400);
    });
    it('should return OutOfLimitOfBountyError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/bounty`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ bounty: 1000 });
      expect(respond.body.message).toMatch(/^BountyOutOfLimitError: /);
      expect(respond.body.code).toBe(400);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/bounty`)
        .send({ bounty: 15 });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return QuestionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/1919810/bounty`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ bounty: 15 });
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
  });
  describe('Accpet answer test', () => {
    it('should accept an answer', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/acceptance`)
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ answer_id: answerIds[0] });
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('OK');
    });
    it('should get the change', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[1]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.data.question.accepted_answer.id).toBe(answerIds[0]);
    });
    it('should return questionIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/1919810/acceptance`)
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ answer_id: answerIds[0] });
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^QuestionIdNotFoundError: /);
    });
    it('should return answerIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/acceptance`)
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ answer_id: 123456798 });
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^AnswerNotFoundError: /);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/acceptance`)
        .query({ answer_id: answerIds[0] });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

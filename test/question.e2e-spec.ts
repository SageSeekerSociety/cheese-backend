/*
 *  Description: This file tests the questions module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('Topic Module', () => {
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
  let TopicIds: number[] = [];
  let questionIds: number[] = [];
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
      const [, accessToken] = await createAuxiliaryUser();
      auxAccessToken = accessToken;
    });
  });

  describe('create question', () => {
    it('should create some questions', async () => {
      async function createQuestion(title, content) {
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
      await Promise.all([
        createQuestion('这学期几号放假啊？', '如题'),
        createQuestion(
          '好难受啊',
          '我这学期选了五十学分，每天都要早八，而且还有好多作业要写，好难受啊。安慰安慰我吧。',
        ),
        createQuestion('Question title with emoji: 😂😂', 'content'),
        createQuestion('title', 'Question content with emoji: 😂😂'),
        createQuestion('long question', '啊'.repeat(30000)),
      ]);
    }, 60000);
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
      expect(respond.body.data.id).toBe(questionIds[0]);
      expect(respond.body.data.title).toContain(TestQuestionPrefix);
      expect(respond.body.data.content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.user.id).toBe(TestUserId);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      expect(respond.body.data.type).toBe(0);
      expect(respond.body.data.topics.length).toBe(2);
      expect(respond.body.data.topics[0].name).toContain(TestTopicPrefix);
      expect(respond.body.data.topics[1].name).toContain(TestTopicPrefix);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.is_follow).toBe(false);
      expect(respond.body.data.is_like).toBe(false);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.view_count).toBe(0);
      expect(respond.body.data.follow_count).toBe(0);
      expect(respond.body.data.like_count).toBe(0);
      expect(respond.body.data.comment_count).toBe(0);
      expect(respond.body.data.is_group).toBe(false);
      expect(respond.body.data.group).toBe(null);
    }, 20000);
    it('should get a question without token', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${questionIds[0]}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.id).toBe(questionIds[0]);
      expect(respond.body.data.title).toContain(TestQuestionPrefix);
      expect(respond.body.data.content).toBe(
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      expect(respond.body.data.user.id).toBe(TestUserId);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      expect(respond.body.data.type).toBe(0);
      expect(respond.body.data.topics.length).toBe(2);
      expect(respond.body.data.topics[0].name).toContain(TestTopicPrefix);
      expect(respond.body.data.topics[1].name).toContain(TestTopicPrefix);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.is_follow).toBe(false);
      expect(respond.body.data.is_like).toBe(false);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.view_count).toBe(1);
      expect(respond.body.data.follow_count).toBe(0);
      expect(respond.body.data.like_count).toBe(0);
      expect(respond.body.data.comment_count).toBe(0);
      expect(respond.body.data.is_group).toBe(false);
      expect(respond.body.data.group).toBe(null);
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

  describe('search question', () => {
    it('should return empty question list', async () => {
      const respond = await request(app.getHttpServer())
        .get('/questions')
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.questions.length).toBe(0);
      expect(respond.body.data.page.page_start).toBe(0);
      expect(respond.body.data.page.page_size).toBe(0);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
    });
    it('should search successfully without page_size and page_start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions?q=${TestQuestionCode}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.questions.length).toBe(
        respond.body.data.page.page_size,
      );
      expect(respond.body.data.page.page_start).toBe(questionIds[0]);
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
      expect(respond.body.data.page.page_start).toBe(questionIds[0]);
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
      expect(respond2.body.data.page.prev_start).toBe(questionIds[0]);
      expect(respond2.body.data.page.has_more).toBe(true);
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
      expect(respond2.body.data.id).toBe(questionIds[0]);
      expect(respond2.body.data.title).toContain('flag');
      expect(respond2.body.data.content).toContain('flag');
      expect(respond2.body.data.type).toBe(1);
      expect(respond2.body.data.topics.length).toBe(1);
      expect(respond2.body.data.topics[0].id).toBe(TopicIds[2]);
      expect(respond2.body.data.topics[0].name).toBe(`${TestTopicPrefix} 钓鱼`);
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
      async function follow(questionId: number) {
        const respond = await request(app.getHttpServer())
          .put(`/questions/${questionId}/followers`)
          .set('Authorization', `Bearer ${TestToken}`)
          .send();
        expect(respond.body.message).toBe('OK');
        expect(respond.body.code).toBe(200);
        expect(respond.status).toBe(200);
        expect(respond.body.data.follow_count).toBe(1);
      }
      await follow(questionIds[1]);
    });
    it('should return QuestionAlreadyFollowedError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/questions/${questionIds[1]}/followers`)
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
      expect(respond.body.data.users.length).toBe(1);
      expect(respond.body.data.users[0].id).toBe(TestUserId);
      expect(respond.body.data.users[0].username).toBe(TestUsername);
      expect(respond.body.data.users[0].nickname).toBe('test_user');
      expect(respond.body.data.page.page_size).toBe(1);
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
      expect(respond2.body.data.page.has_more).toBe(false);
      expect(respond2.body.data.page.next_start).toBe(0);

      const respond3 = await request(app.getHttpServer())
        .get(
          `/questions/${questionIds[1]}/followers?page_size=1&page_start=${TestUserId}`,
        )
        .send();
      expect(respond3.body).toStrictEqual(respond2.body);
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
        expect(respond.body.data.follow_count).toBe(0);
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

  afterAll(async () => {
    await app.close();
  });
});
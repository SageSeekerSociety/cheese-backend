/*
 *  Description: This file tests the topic module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication } from '@nestjs/common';
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
  const TestQuestionPrefix = `[Test(${TestTopicCode}) Question]`;
  var TestUserId: number;
  var TestRefreshToken: string;
  var TestToken: string;
  var TopicIds: number[] = [];

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
    });
    it('should login successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'abc123456!!!',
        });
      expect(respond.body.message).toBe('Login successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      TestUserId = respond.body.data.user.id;
      TestRefreshToken = respond.body.data.refreshToken;
      const respond2 = await request(app.getHttpServer())
        .get('/users/auth/access-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toBe('Refresh token successfully.');
      expect(respond2.status).toBe(200);
      expect(respond2.body.code).toBe(200);
      expect(respond2.body.accessToken).toBeDefined();
      TestToken = respond2.body.accessToken;
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
      await Promise.all([
        createTopic('数学'),
        createTopic('哥德巴赫猜想'),
      ]);
    });
  });

  describe('create question', () => {
    it('should create a question', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: `${TestTopicPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content: '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [TopicIds[0], TopicIds[1]],
        });
      expect(respond.body.message).toBe('Created');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(respond.body.data.id).toBeDefined();
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .send({
          title: `${TestTopicPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content: '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
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
          title: `${TestTopicPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content: '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [-1],
        });
      expect(respond.body.message).toMatch(/^TopicNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

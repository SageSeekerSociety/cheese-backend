/*
 *  Description: This file tests the topic module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
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
  const TestTopicPrefix = `[Test(${TestTopicCode}) Topic]`;
  let TestToken: string;
  const TopicIds: number[] = [];

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
    });
  });

  describe('create topic', () => {
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
        expect(respond.body.data.id).toBeDefined();
        // expect(respond.body.data.name).toBe(`${TestTopicPrefix} ${name}`);
        TopicIds.push(respond.body.data.id);
      }
      await createTopic('高等数学');
      await createTopic('高等代数');
      await createTopic('高等数学习题');
      await createTopic('高等代数习题');
      await createTopic('大学英语');
      await createTopic('军事理论（思政）');
      await createTopic('思想道德与法治（思政）');
      await createTopic('大学物理');
      await createTopic('普通物理');
      await createTopic('An English Topic');
      await createTopic('An English topic with some 中文 in it');
      await createTopic('Emojis in the topic name 😂😂😂');
      await createTopic('Emojis in the topic name 🧑‍🦲');
      await createTopic('Emojis in the topic name 😂😂😂 with some 中文 in it');
      await createTopic('Emojis in the topic name 🧑‍🦲 with some 中文 in it');
    }, 60000);
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/topics')
        .send({
          name: `${TestTopicPrefix} 高等数学`,
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
    });
    it('should return InvalidTokenError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/topics')
        .set('authorization', 'Bearer ' + TestToken + '1')
        .send({
          name: `${TestTopicPrefix} 高等数学`,
        });
      expect(respond.body.message).toMatch(/^InvalidTokenError: /);
      expect(respond.status).toBe(401);
    });
    it('should return TopicAlreadyExistsError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/topics')
        .set('authorization', 'Bearer ' + TestToken)
        .send({
          name: `${TestTopicPrefix} 高等数学`,
        });
      expect(respond.body.message).toMatch(/^TopicAlreadyExistsError: /);
      expect(respond.status).toBe(409);
    });
  });

  describe('search topic', () => {
    it('should wait some time for elasticsearch to refresh', async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });
    it('should return empty page without parameters', async () => {
      const respond = await request(app.getHttpServer()).get('/topics').send();
      expect(respond.body.message).toBe('OK');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(200);
      expect(respond.body.data.topics.length).toBe(0);
      expect(respond.body.data.page.page_size).toBe(0);
      expect(respond.body.data.page.page_start).toBe(0);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
    });
    it('should search topics and do paging', async () => {
      // Try search: `${TestTopicCode} 高等`
      const respond = await request(app.getHttpServer())
        .get(`/topics?q=${TestTopicCode}%20%E9%AB%98%E7%AD%89`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.topics.length).toBeGreaterThanOrEqual(15);
      for (let i = 0; i < 4; i++) {
        expect(respond.body.data.topics[i].name).toContain(TestTopicCode);
      }

      const respond2 = await request(app.getHttpServer())
        .get(`/topics?q=${TestTopicCode}%20%E9%AB%98%E7%AD%89&page_size=3`)
        .set('authorization', 'Bearer ' + TestToken)
        .set('User-Agent', 'PostmanRuntime/7.26.8')
        .send();
      expect(respond2.body.message).toBe('OK');
      expect(respond2.status).toBe(200);
      expect(respond2.body.code).toBe(200);
      expect(respond2.body.data.topics.length).toBe(3);
      expect(respond2.body.data.topics[0].name).toContain(TestTopicCode);
      expect(respond2.body.data.topics[0].name).toContain('高等');
      expect(respond2.body.data.topics[1].name).toContain(TestTopicCode);
      expect(respond2.body.data.topics[1].name).toContain('高等');
      expect(respond2.body.data.topics[2].name).toContain(TestTopicCode);
      expect(respond2.body.data.topics[2].name).toContain('高等');
      expect(respond2.body.data.page.page_size).toBe(3);
      expect(respond2.body.data.page.has_prev).toBe(false);
      expect(respond2.body.data.page.prev_start).toBe(0);
      expect(respond2.body.data.page.has_more).toBe(true);

      const respond3 = await request(app.getHttpServer())
        .get(
          `/topics?q=${TestTopicCode}%20%E9%AB%98%E7%AD%89&page_size=3&page_start=${respond2.body.data.page.next_start}`,
        )
        .send();
      expect(respond3.body.message).toBe('OK');
      expect(respond3.status).toBe(200);
      expect(respond3.body.code).toBe(200);
      expect(respond3.body.data.topics.length).toBe(3);
      expect(respond3.body.data.topics[0].id).toBe(
        respond2.body.data.page.next_start,
      );
      expect(respond3.body.data.topics[0].name).toContain(TestTopicCode);
      expect(respond3.body.data.topics[0].name).toContain('高等');
      expect(respond3.body.data.page.page_start).toBe(
        respond3.body.data.topics[0].id,
      );
      expect(respond3.body.data.page.page_size).toBe(3);
      expect(respond3.body.data.page.has_prev).toBe(true);
      expect(respond3.body.data.page.prev_start).toBe(
        respond2.body.data.topics[0].id,
      );
      expect(respond3.body.data.page.has_more).toBe(true);

      const respond4 = await request(app.getHttpServer())
        .get(
          `/topics?q=${TestTopicCode}%20%E9%AB%98%E7%AD%89&page_size=3&page_start=${respond2.body.data.page.page_start}`,
        )
        .set('authorization', 'Bearer ' + TestToken)
        .set('User-Agent', 'PostmanRuntime/7.26.8')
        .send();
      expect(respond4.body).toStrictEqual(respond2.body);

      // Try emoji search to see if unicode storage works.
      const respond5 = await request(app.getHttpServer())
        .get(
          `/topics?q=${TestTopicCode}%20%F0%9F%A7%91%E2%80%8D%F0%9F%A6%B2&page_size=3`,
        )
        .send();
      expect(respond5.body.message).toBe('OK');
      expect(respond5.status).toBe(200);
      expect(respond5.body.data.topics.length).toBe(3);
      expect(respond5.body.data.topics[0].name).toBe(
        `${TestTopicPrefix} Emojis in the topic name 🧑‍🦲`,
      );
      expect(respond5.body.data.topics[1].name).toBe(
        `${TestTopicPrefix} Emojis in the topic name 🧑‍🦲 with some 中文 in it`,
      );
    }, 60000);
    it('should return an empty page', () => {
      return request(app.getHttpServer())
        .get('/topics?q=%E6%AF%B3%E6%AF%B3%E6%AF%B3%E6%AF%B3')
        .send()
        .then((respond) => {
          expect(respond.body.message).toBe('OK');
          expect(respond.status).toBe(200);
          expect(respond.body.code).toBe(200);
          expect(respond.body.data.topics.length).toBe(0);
          expect(respond.body.data.page.page_start).toBe(0);
          expect(respond.body.data.page.page_size).toBe(0);
          expect(respond.body.data.page.has_prev).toBe(false);
          expect(respond.body.data.page.prev_start).toBe(0);
          expect(respond.body.data.page.has_more).toBe(false);
          expect(respond.body.data.page.next_start).toBe(0);
        });
    });
    it('should return TopicNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get('/topics?q=something&page_start=-1')
        .send();
      expect(respond.body.message).toMatch(/^TopicNotFoundError: /);
      expect(respond.status).toBe(404);
    });
    it('should return BadRequestException', async () => {
      const respond = await request(app.getHttpServer())
        .get('/topics?q=something&page_start=abc')
        .send();
      expect(respond.body.message).toMatch(/^BadRequestException: /);
      expect(respond.status).toBe(400);
    });
  });

  describe('get topic', () => {
    it('should get a topic', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/topics/${TopicIds[0]}`)
        .send();
      expect(respond.body.message).toBe('OK');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.topic.id).toBe(TopicIds[0]);
      expect(respond.body.data.topic.name).toBe(`${TestTopicPrefix} 高等数学`);
    });
    it('should return TopicNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get('/topics/-1')
        .send();
      expect(respond.body.message).toMatch(/^TopicNotFoundError: /);
      expect(respond.status).toBe(404);
    });
    it('should return BadRequestException', async () => {
      const respond = await request(app.getHttpServer())
        .get('/topics/abc')
        .send();
      expect(respond.body.message).toMatch(/^BadRequestException: /);
      expect(respond.status).toBe(400);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

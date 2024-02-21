/*
 *  Description: This file tests the profile submodule of user module.
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

describe('Profile Submodule of User Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  let TestToken: string;
  let TestUserId: number;

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
      TestUserId = respond.body.data.user.id;
    });
  });

  describe('update user profile', () => {
    it('should update user profile', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken)
        .send({
          nickname: 'test_user_updated',
          avatar: 'default.jpg',
          intro: 'test user updated',
        });
      expect(respond.body.message).toBe('Update user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    });
    it('should return InvalidTokenError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken + '1')
        .send({
          nickname: 'test_user_updated',
          avatar: 'default.jpg',
          intro: 'test user updated',
        });
      expect(respond.body.message).toMatch(/^InvalidTokenError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          nickname: 'test_user_updated',
          avatar: 'default.jpg',
          intro: 'test user updated',
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('get user profile', () => {
    it('should get modified user profile', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user_updated');
      expect(respond.body.data.user.avatar).toBe('default.jpg');
      expect(respond.body.data.user.intro).toBe('test user updated');
    });
    it('should get modified user profile even without a token', async () => {
      const respond = await request(app.getHttpServer()).get(
        `/users/${TestUserId}`,
      );
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      //.set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user_updated');
      expect(respond.body.data.user.avatar).toBe('default.jpg');
      expect(respond.body.data.user.intro).toBe('test user updated');
    });
    it('should return UserIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer()).get(`/users/-1`);
      expect(respond.body.message).toMatch(/^UserIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

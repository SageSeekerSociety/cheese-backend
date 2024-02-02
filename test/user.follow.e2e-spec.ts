/*
 *  Description: This file tests the following submodule of user module.
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

describe('Following Submodule of User Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  let TestToken: string;
  let TestUserId: number;

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
      TestUserId = respond.body.data.user.id;
    });
  });

  describe('follow logic', () => {
    const tempUserIds: number[] = [];
    const tempUserTokens: string[] = [];
    it('should successfully create some auxiliary users first', async () => {
      for (let i = 0; i < 10; i++) {
        const [id, token] = await createAuxiliaryUser();
        tempUserIds.push(id);
        tempUserTokens.push(token);
      }
    });

    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer()).post(
        `/users/${tempUserIds[0]}/followers`,
      );
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });

    it('should return UserIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${tempUserIds[0] + 1000000000}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^UserIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });

    it('should return FollowYourselfError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${TestUserId}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^FollowYourselfError: /);
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
    });

    it('should follow user successfully', async () => {
      for (const id of tempUserIds) {
        const respond = await request(app.getHttpServer())
          .post(`/users/${id}/followers`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond.body.message).toBe('Follow user successfully.');
        expect(respond.status).toBe(201);
        expect(respond.body.code).toBe(201);
      }
    });

    it('should follow user successfully', async () => {
      for (const token of tempUserTokens) {
        const respond = await request(app.getHttpServer())
          .post(`/users/${TestUserId}/followers`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + token)
          .send();
        expect(respond.body.message).toBe('Follow user successfully.');
        expect(respond.status).toBe(201);
        expect(respond.body.code).toBe(201);
      }
    });

    it('should return UserAlreadyFollowedError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${tempUserIds[0]}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^UserAlreadyFollowedError: /);
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
    });

    let unfollowedUserId: number;
    it('should unfollow user successfully', async () => {
      unfollowedUserId = tempUserIds.at(-1)!;
      const respond = await request(app.getHttpServer())
        .delete(`/users/${unfollowedUserId}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Unfollow user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      tempUserIds.pop();
    });

    it('should return UserNotFollowedYetError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/users/${unfollowedUserId}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^UserNotFollowedYetError: /);
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
    });

    it('should get follower list successfully', async () => {
      for (const id of tempUserIds) {
        const respond = await request(app.getHttpServer())
          .get(`/users/${id}/followers`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond.body.message).toBe('Query followers successfully.');
        expect(respond.status).toBe(200);
        expect(respond.body.code).toBe(200);
        expect(respond.body.data.users.length).toBe(1);
        expect(respond.body.data.users[0].id).toBe(TestUserId);
        expect(respond.body.data.users[0].avatar).toBe('default.jpg');
        expect(respond.body.data.page.page_start).toBe(TestUserId);
        expect(respond.body.data.page.page_size).toBe(1);
        expect(respond.body.data.page.has_prev).toBe(false);
        expect(respond.body.data.page.prev_start).toBe(0);
        expect(respond.body.data.page.has_more).toBe(false);
        expect(respond.body.data.page.next_start).toBe(0);

        const respond2 = await request(app.getHttpServer())
          .get(`/users/${id}/followers?page_start=${TestUserId}&page_size=1`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond2.body.message).toBe('Query followers successfully.');
        expect(respond2.status).toBe(200);
        expect(respond2.body.code).toBe(200);
        expect(respond2.body.data.users.length).toBe(1);
        expect(respond2.body.data.users[0].id).toBe(TestUserId);
        expect(respond2.body.data.users[0].avatar).toBe('default.jpg');
        expect(respond2.body.data.page.page_start).toBe(TestUserId);
        expect(respond2.body.data.page.page_size).toBe(1);
        expect(respond2.body.data.page.has_prev).toBe(false);
        expect(respond2.body.data.page.prev_start).toBe(0);
        expect(respond2.body.data.page.has_more).toBe(false);
        expect(respond2.body.data.page.next_start).toBe(0);
      }
      const respond3 = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        //.set('authorization', 'Bearer ' + TestToken);
        .send();
      expect(respond3.body.message).toBe('Query followers successfully.');
      expect(respond3.status).toBe(200);
      expect(respond3.body.code).toBe(200);
      expect(respond3.body.data.users.length).toBe(tempUserTokens.length);
      expect(respond3.body.data.users[0].id).toBe(tempUserIds[0]);
      expect(respond3.body.data.users[0].avatar).toBeDefined();
      expect(respond3.body.data.page.page_start).toBe(tempUserIds[0]);
      expect(respond3.body.data.page.page_size).toBe(tempUserTokens.length);
      expect(respond3.body.data.page.has_prev).toBe(false);
      expect(respond3.body.data.page.prev_start).toBe(0);
      expect(respond3.body.data.page.has_more).toBe(false);
      expect(respond3.body.data.page.next_start).toBe(0);

      const respond4 = await request(app.getHttpServer())
        .get(
          `/users/${TestUserId}/followers?page_start=${tempUserIds[3]}&page_size=3`,
        )
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        //.set('authorization', 'Bearer ' + TestToken);
        .send();
      expect(respond4.body.message).toBe('Query followers successfully.');
      expect(respond4.status).toBe(200);
      expect(respond4.body.code).toBe(200);
      expect(respond4.body.data.users.length).toBe(3);
      expect(respond4.body.data.users[0].id).toBe(tempUserIds[3]);
      expect(respond4.body.data.users[1].id).toBe(tempUserIds[4]);
      expect(respond4.body.data.users[2].id).toBe(tempUserIds[5]);
      expect(respond4.body.data.page.page_start).toBe(tempUserIds[3]);
      expect(respond4.body.data.page.page_size).toBe(3);
      expect(respond4.body.data.page.has_prev).toBe(true);
      expect(respond4.body.data.page.prev_start).toBe(tempUserIds[0]);
      expect(respond4.body.data.page.has_more).toBe(true);
      expect(respond4.body.data.page.next_start).toBe(tempUserIds[6]);
    });

    it('should get following list and split the page successfully', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/follow/users`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query followees successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.users.length).toBe(9);
      expect(respond.body.data.users[0].id).toBe(tempUserIds[0]);
      expect(respond.body.data.page.page_start).toBe(tempUserIds[0]);
      expect(respond.body.data.page.page_size).toBe(9);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);

      const respond2 = await request(app.getHttpServer())
        .get(
          `/users/${TestUserId}/follow/users?page_start=${tempUserIds[0]}&page_size=1`,
        )
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond2.body.message).toBe('Query followees successfully.');
      expect(respond2.status).toBe(200);
      expect(respond2.body.code).toBe(200);
      expect(respond2.body.data.users.length).toBe(1);
      expect(respond2.body.data.users[0].id).toBe(tempUserIds[0]);
      expect(respond2.body.data.page.page_start).toBe(tempUserIds[0]);
      expect(respond2.body.data.page.page_size).toBe(1);
      expect(respond2.body.data.page.has_prev).toBe(false);
      expect(respond2.body.data.page.prev_start).toBe(0);
      expect(respond2.body.data.page.has_more).toBe(true);
      expect(respond2.body.data.page.next_start).toBe(tempUserIds[1]);

      const respond3 = await request(app.getHttpServer())
        .get(
          `/users/${TestUserId}/follow/users?page_start=${tempUserIds[2]}&page_size=2`,
        )
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond3.body.message).toBe('Query followees successfully.');
      expect(respond3.status).toBe(200);
      expect(respond3.body.code).toBe(200);
      expect(respond3.body.data.users.length).toBe(2);
      expect(respond3.body.data.users[0].id).toBe(tempUserIds[2]);
      expect(respond3.body.data.page.page_start).toBe(tempUserIds[2]);
      expect(respond3.body.data.page.page_size).toBe(2);
      expect(respond3.body.data.page.has_prev).toBe(true);
      expect(respond3.body.data.page.prev_start).toBe(tempUserIds[0]);
      expect(respond3.body.data.page.has_more).toBe(true);
      expect(respond3.body.data.page.next_start).toBe(tempUserIds[4]);
    }, 20000);
  });

  afterAll(async () => {
    await app.close();
  });
});

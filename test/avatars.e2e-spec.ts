import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('Avatar Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;

  let TestToken: string;
  let AvatarId: number;

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
  describe('upload avatar', () => {
    it('should upload an avatar', async () => {
      const respond = await request(app.getHttpServer())
        .post('/avatars')
        .attach('avatar', 'resources/default.jpg')
        .set('Authorization', `Bearer ${TestToken}`);
      expect(respond.status).toBe(201);
      expect(respond.body.message).toBe('Upload avatar successfully');
      expect(respond.body.data).toHaveProperty('avatarid');
      AvatarId = respond.body.data.avatarid;
    });
  });
  describe('get avatar', () => {
    it('should get the uploaded avatar', async () => {
      const avatarId = AvatarId;
      const respond = await request(app.getHttpServer())
        .get(`/avatars/${avatarId}`)
        .send()
        .responseType('blob');
      expect(respond.status).toBe(200);
      expect(respond.headers['content-type']).toEqual(
        'application/octet-stream',
      );
      expect(respond.headers['content-disposition']).toContain('attachment');
    });
    it('should return AvatarNotFoundError when an avatar is not found', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/100')
        .send();
      expect(respond.body.message).toContain('Avatar 100 Not Found');
      expect(respond.status).toBe(404);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});

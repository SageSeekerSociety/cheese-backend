import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AvatarType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
jest.mock('../src/email/email.service');

describe('Avatar Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  let TestToken: string;
  let TestUserId: number;
  let AvatarId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000);
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
  });

  describe('upload avatar', () => {
    it('should upload an avatar', async () => {
      const respond = await request(app.getHttpServer())
        .post('/avatars')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('avatar', 'src/resources/avatars/default.jpg');
      expect(respond.status).toBe(201);
      expect(respond.body.message).toBe('Upload avatar successfully');
      expect(respond.body.data).toHaveProperty('avatarId');
      AvatarId = respond.body.data.avatarId;
    });
    it('should upload a large avatar', async () => {
      const respond = await request(app.getHttpServer())
        .post('/avatars')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('avatar', 'test/resources/large-image.jpg');
      expect(respond.status).toBe(201);
      expect(respond.body.message).toBe('Upload avatar successfully');
      expect(respond.body.data).toHaveProperty('avatarId');
    });
    it('should return AuthenticationRequiredError when no token is provided', async () => {
      const respond = await request(app.getHttpServer())
        .post('/avatars')
        .attach('avatar', 'src/resources/avatars/default.jpg');
      expect(respond.status).toBe(401);
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
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
      expect(respond.headers['cache-control']).toContain('max-age');
      expect(respond.headers['content-type']).toMatch(/image\/.*/);
      expect(respond.headers['content-disposition']).toContain('inline');
      expect(respond.headers['content-length']).toBeDefined();
      expect(respond.headers['etag']).toBeDefined();
      expect(respond.headers['last-modified']).toBeDefined();
    });
    it('should return AvatarNotFoundError when an avatar is not found', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/1000')
        .send();
      expect(respond.body.message).toMatch(/^AvatarNotFoundError: /);
      expect(respond.status).toBe(404);
    });
    it('should get avatar without authentication', async () => {
      const avatarId = AvatarId;
      const respond = await request(app.getHttpServer())
        .get(`/avatars/${avatarId}`)
        .send()
        .responseType('blob');
      expect(respond.status).toBe(200);
      expect(respond.headers['cache-control']).toContain('max-age');
      expect(respond.headers['content-type']).toMatch(/image\/.*/);
      expect(respond.headers['content-disposition']).toContain('inline');
      expect(respond.headers['content-length']).toBeDefined();
      expect(respond.headers['etag']).toBeDefined();
      expect(respond.headers['last-modified']).toBeDefined();
    });
  });
  describe('get default avatar', () => {
    it('should get default avatar', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/default')
        .send();
      expect(respond.status).toBe(200);
      expect(respond.headers['cache-control']).toContain('max-age');
      expect(respond.headers['content-type']).toMatch(/image\/.*/);
      expect(respond.headers['content-disposition']).toContain('inline');
      expect(respond.headers['content-length']).toBeDefined();
      expect(respond.headers['etag']).toBeDefined();
      expect(respond.headers['last-modified']).toBeDefined();
    });
  });
  describe('get pre available avatarIds', () => {
    it('should get available avatarIds', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/')
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ type: AvatarType.predefined })
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.message).toContain(
        'Get available avatarIds successfully',
      );
      expect(respond.body.data.avatarIds.length).toEqual(3);
    });
    it('should return InvalidAvatarTypeError', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/')
        .set('Authorization', `Bearer ${TestToken}`)
        .query({ type: 'yuiiiiiii' })
        .send();
      expect(respond.status).toBe(400);
      expect(respond.body.message).toContain('Invalid Avatar type');
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/')
        .query({ type: AvatarType.predefined })
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

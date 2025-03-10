import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
jest.mock('../src/email/email.service');

describe('Attachment Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;

  let TestToken: string;
  let ImageId: number;
  let ImageAsFileId: number;
  let VideoId: number;
  let VideoAsFileId: number;
  let AudioId: number;
  let AudioAsFileId: number;
  let FileId: number;
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
          isLegacyAuth: true,
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual('Register successfully.');
      expect(respond.body.code).toEqual(201);
      req.expect(201);
      expect(respond.body.data.accessToken).toBeDefined();
      TestToken = respond.body.data.accessToken;
      expect(respond.body.data.user.id).toBeDefined();
    });
  });
  describe('upload attachments', () => {
    it('should upload an image', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'image')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.jpg');
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.code).toBe(201);
      expect(respond.body.data).toHaveProperty('id');
      ImageId = respond.body.data.id;
    });
    it('should upload an image as file', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'file')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.jpg');
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.code).toBe(201);
      expect(respond.body.data).toHaveProperty('id');
      ImageAsFileId = respond.body.data.id;
    });
    it('should upload a video ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'video')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp4');
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.data).toHaveProperty('id');
      VideoId = respond.body.data.id;
    });
    it('should upload a video as file ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'file')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp4');
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.data).toHaveProperty('id');
      VideoAsFileId = respond.body.data.id;
    });
    it('should upload an audio ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'audio')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp3');
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.data).toHaveProperty('id');
      AudioId = respond.body.data.id;
    });
    it('should upload an audio as file', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'file')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp3');
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.data).toHaveProperty('id');
      AudioAsFileId = respond.body.data.id;
    });
    it('should upload a file ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'file')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe('Attachment uploaded successfully');
      expect(respond.body.data).toHaveProperty('id');
      FileId = respond.body.data.id;
    });
    it('should return InvalidAttachmentTypeError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'yuiii')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.body.code).toBe(400);
      expect(respond.body.message).toMatch(/InvalidAttachmentTypeError: /);
    });
    it('should return MimeTypeNotMatchError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/attachments')
        .field('type', 'image')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
      expect(respond.body.message).toMatch(/MimeTypeNotMatchError: /);
    });
  });
  describe('get attachment', () => {
    it('should get the uploaded image detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${ImageId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.attachment.meta.height).toEqual(200);
      expect(respond.body.data.attachment.meta.width).toEqual(200);
      expect(respond.body.data.attachment.meta.size).toEqual(53102);
    });
    it('should get the uploaded video detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${VideoId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.attachment.meta.height).toEqual(1080);
      expect(respond.body.data.attachment.meta.width).toEqual(2160);
      expect(respond.body.data.attachment.meta.size).toEqual(240563);
      expect(respond.body.data.attachment.meta.duration).toBeCloseTo(3.1, 0.15);
      expect(respond.body.data.attachment.meta.thumbnail).toMatch(
        /static\/images\/.*\.jpg/,
      );
    });
    it('should get the uploaded audio detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${AudioId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.attachment.meta.size).toEqual(70699);
      expect(respond.body.data.attachment.meta.duration).toEqual(3);
    });

    it('should get the uploaded file detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${ImageAsFileId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
    });
    it('should get the uploaded file detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${VideoAsFileId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
    });
    it('should get the uploaded file detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${AudioAsFileId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
    });
    it('should get the uploaded file detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${FileId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.attachment.meta.mime).toBe('application/pdf');
      expect(respond.body.data.attachment.meta.size).toEqual(50146);
    });
    it('should return AttachmentNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/attachments/${FileId + 20}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/AttachmentNotFoundError: /);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});

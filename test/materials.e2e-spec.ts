import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
jest.mock('../src/email/email.service');

describe('Material Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;

  let TestToken: string;
  let ImageId: number;
  let VideoId: number;
  let AudioId: number;
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
  describe('upload materials', () => {
    it('should upload an image', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'image')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.jpg');
      expect(respond.body.message).toBe('Material upload successfully');
      expect(respond.body.code).toBe(200);
      expect(respond.body.data).toHaveProperty('id');
      ImageId = respond.body.data.id;
    });
    it('should upload a video ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'video')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp4');
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Material upload successfully');
      expect(respond.body.data).toHaveProperty('id');
      VideoId = respond.body.data.id;
    });
    it('should upload an audio ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'audio')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.mp3');
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Material upload successfully');
      expect(respond.body.data).toHaveProperty('id');
      AudioId = respond.body.data.id;
    });
    it('should upload a file ', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'file')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Material upload successfully');
      expect(respond.body.data).toHaveProperty('id');
      FileId = respond.body.data.id;
    });
    it('should return InvalidMaterialTypeError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'yuiii')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.body.code).toBe(400);
      expect(respond.body.message).toMatch(/InvalidMaterialTypeError: /);
    });
    it('should return MimeTypeNotMatchError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'image')
        .set('Authorization', `Bearer ${TestToken}`)
        .attach('file', 'src/materials/resources/test.pdf');
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
      expect(respond.body.message).toMatch(/MimeTypeNotMatchError: /);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/materials')
        .field('type', 'image')
        .attach('file', 'src/materials/resources/test.jpg');
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
      expect(respond.body.message).toMatch(/AuthenticationRequiredError: /);
    });
  });
  describe('get material', () => {
    it('should get the uploaded image detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${ImageId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.material.meta.height).toEqual(200);
      expect(respond.body.data.material.meta.width).toEqual(200);
      expect(respond.body.data.material.meta.hash).toBe(
        'f50ed1d47f88ddd0934f088fb63262fd',
      );
      expect(respond.body.data.material.meta.size).toEqual(53102);
    });
    it('should get the uploaded video detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${VideoId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.material.meta.height).toEqual(1080);
      expect(respond.body.data.material.meta.width).toEqual(2160);
      expect(respond.body.data.material.meta.size).toEqual(240563);
      expect(respond.body.data.material.meta.hash).toBe(
        '7333193845d631941208e2e546ff57af',
      );
      expect(respond.body.data.material.meta.duration).toBeCloseTo(3.1, 0.15);
      expect(respond.body.data.material.meta.thumbnail).toMatch(
        /static\/images\/.*\.jpg/,
      );
    });
    it('should get the uploaded audio detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${AudioId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.material.meta.size).toEqual(70699);
      expect(respond.body.data.material.meta.duration).toEqual(3);
      expect(respond.body.data.material.meta.hash).toBe(
        'f785204fc974ae48fe818ac9052ccf0b',
      );
    });

    it('should get the uploaded file detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${FileId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.material.meta.mime).toBe('application/pdf');
      expect(respond.body.data.material.meta.hash).toBe(
        '748cafd9b83123300f712375bba68ec3',
      );
      expect(respond.body.data.material.meta.size).toEqual(50146);
    });
    it('should return MaterialNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${FileId + 20}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/MaterialNotFoundError: /);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/materials/${FileId}`)
        .send();
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
      expect(respond.body.message).toMatch(/AuthenticationRequiredError: /);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});

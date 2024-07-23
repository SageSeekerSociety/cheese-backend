import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
jest.mock('../src/email/email.service');

describe('MaterialBundle Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  const unique = Math.floor(Math.random() * 10000000000);
  const bundleIds: number[] = [];
  let TestToken: string;
  let TestUserId: number;
  let ImageId: number;
  let VideoId: number;
  let AudioId: number;
  let FileId: number;
  let bundleId1: number;
  let bundleId2: number;
  let auxAccessToken: string;
  async function createAuxiliaryUser(): Promise<string> {
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
    return respond2.body.data.accessToken;
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
    it('upload some materials', async () => {
      async function uploadMaterial(type: string, filePath: string) {
        const response = await request(app.getHttpServer())
          .post('/materials')
          .field('type', type)
          .set('Authorization', `Bearer ${TestToken}`)
          .attach('file', filePath);

        expect(response.body.code).toBe(200);
        expect(response.body.message).toBe('Material upload successfully');
        expect(response.body.data).toHaveProperty('id');
        return response.body.data.id;
      }
      const promises = [
        uploadMaterial('image', 'src/materials/resources/test.jpg'),
        uploadMaterial('video', 'src/materials/resources/test.mp4'),
        uploadMaterial('audio', 'src/materials/resources/test.mp3'),
        uploadMaterial('file', 'src/materials/resources/test.pdf'),
      ];
      [ImageId, VideoId, AudioId, FileId] = await Promise.all(promises);
    });
    it('should create an auxiliary user', async () => {
      auxAccessToken = await createAuxiliaryUser();
    });
  });
  describe('create some materialbundles', () => {
    it('should create some materialbundles', async () => {
      async function createMaterialBundle(
        materialIds: number[],
        title: string,
        content: string,
      ) {
        const respond = await request(app.getHttpServer())
          .post('/material-bundles')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({
            title,
            content,
            materials: materialIds,
          });
        expect(respond.body.message).toBe(
          'MaterialBundle created successfully',
        );
        expect(respond.body.code).toBe(201);
        expect(respond.body.data).toHaveProperty('id');
        return respond.body.data.id;
      }
      bundleId1 = await createMaterialBundle(
        [ImageId, VideoId, AudioId],
        'a materialbundle',
        'content about materialbundle',
      );
      bundleId2 = await createMaterialBundle(
        [ImageId, VideoId, FileId],
        'a materialbundle',
        'content about materialbundle',
      );
      for (let i = 0; i < 20; i++) {
        const bundleId = await createMaterialBundle(
          [],
          'test_for_pagination-' + unique.toString(),
          `just_for_test`,
        );
        bundleIds.push(bundleId);
      }
    });
    it('should return MaterialNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/material-bundles')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: 'a materialbundle',
          content: 'content about materialbundle',
          materials: [ImageId, VideoId, FileId, FileId + 30],
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^MaterialNotFoundError: /);
    });
  });
  describe('get materialbundles', () => {
    it('should get all of the materialbundles', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: '',
          sort: '',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(20);
      expect(respond.body.data.materials[0].id).toEqual(1);
      expect(respond.body.data.page.page_size).toBe(20);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(true);
      //expect(respond.body.data.page.next_start).toBe();
    });
    it('should get the materialbundles with keyword without size and start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: unique.toString(),
          sort: '',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(20);
      respond.body.data.materials
        .slice(0, 20)
        .map((material: { id: number }, index: number) => {
          expect(material.id).toEqual(bundleIds[index]);
        });
      expect(respond.body.data.page.page_size).toBe(20);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);
    });
    it('should get the materialbundles with keyword and size without start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: unique.toString(),
          page_size: 10,
          sort: '',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(10);
      respond.body.data.materials
        .slice(0, 10)
        .map((material: { id: number }, index: number) => {
          expect(material.id).toEqual(bundleIds[index]);
        });
      expect(respond.body.data.page.page_size).toBe(10);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(bundleIds[10]);
    });
    it('should get the materialbundles with keyword,size and start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: unique.toString(),
          page_size: 10,
          page_start: bundleIds[4],
          sort: '',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(10);
      respond.body.data.materials
        .slice(0, 10)
        .map((material: { id: number }, index: number) => {
          expect(material.id).toEqual(bundleIds[index + 4]);
        });
      expect(respond.body.data.page.page_size).toBe(10);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(bundleIds[3]);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(bundleIds[14]);
    });
    it('should get the materialbundles with keyword,size and search syntax string as start', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: `title:${unique.toString()} id:>=${bundleIds[4]}`,
          page_size: 10,
          sort: '',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(10);
      respond.body.data.materials
        .slice(0, 10)
        .map((material: { id: number }, index: number) => {
          expect(material.id).toEqual(bundleIds[index + 4]);
        });
      expect(respond.body.data.page.page_size).toBe(10);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(bundleIds[14]);
    });
    it('should get the materialbundles with keyword,size,start and sort', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: unique.toString(),
          page_size: 10,
          page_start: bundleIds[14],
          sort: 'newest',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('get material bundles successfully');
      expect(respond.body.data.materials.length).toEqual(10);
      respond.body.data.materials
        .slice(0, 10)
        .map((material: { id: number }, index: number) => {
          expect(material.id).toEqual(bundleIds[14 - index]);
        });
      expect(respond.body.data.page.page_size).toBe(10);
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(bundleIds[15]);
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(bundleIds[4]);
    });
    it('should return KeywordTooLongError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles`)
        .query({
          q: 'yui'.repeat(100),
          page_size: 10,
          page_start: bundleIds[14],
          sort: 'newest',
        });
      expect(respond.status).toBe(400);
      expect(respond.body.code).toBe(400);
      expect(respond.body.message).toMatch(/^KeywordTooLongError: /);
    });
    it('should get the materialbundle detail', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles/${bundleId1}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.message).toBe(
        'get material bundle detail successfully',
      );
      expect(respond.body.data.materialBundle.title).toBe('a materialbundle');
      expect(respond.body.data.materialBundle.content).toBe(
        'content about materialbundle',
      );
      expect(respond.body.data.materialBundle.creator.id).toEqual(TestUserId);
      expect(respond.body.data.materialBundle.materials.length).toEqual(3);
      for (const material of respond.body.data.materialBundle.materials) {
        expect([ImageId, VideoId, AudioId]).toContain(material.id);
      }

      // to do
    });
    it('should return BundleNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/material-bundles/${bundleId1 + 30}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^BundleNotFoundError: /);
    });
  });
  describe('update materialbundle', () => {
    it('should update the materialbundle', async () => {
      const respond1 = await request(app.getHttpServer())
        .patch(`/material-bundles/${bundleId2}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: 'new title',
          content: 'new content',
          materials: [ImageId, VideoId, AudioId], // add new & remove old
        });
      expect(respond1.status).toBe(200);
      expect(respond1.body.message).toBe('Materialbundle updated successfully');
      const respond2 = await request(app.getHttpServer())
        .get(`/material-bundles/${bundleId2}`)
        .send();
      expect(respond2.body.data.materialBundle.title).toBe('new title');
      expect(respond2.body.data.materialBundle.content).toBe('new content');
      expect(respond2.body.data.materialBundle.creator.id).toEqual(TestUserId);
      expect(respond2.body.data.materialBundle.materials.length).toEqual(3);
      for (const material of respond2.body.data.materialBundle.materials) {
        expect([ImageId, VideoId, AudioId]).toContain(material.id);
      }
    });
    it('should return BundleNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .patch(`/material-bundles/${bundleId1 + 30}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^BundleNotFoundError: /);
    });
    it('should return UpdateBundleDeniedErro', async () => {
      const respond = await request(app.getHttpServer())
        .patch(`/material-bundles/${bundleId1}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(403);
      expect(respond.body.code).toBe(403);
      expect(respond.body.message).toMatch(/^UpdateBundleDeniedError: /);
    });
  });
  describe('delete materialbundle', () => {
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/material-bundles/${bundleId2}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return BundleNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/material-bundles/${bundleId1 + 30}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^BundleNotFoundError: /);
    });
    it('should return DeleteBundleDeniedError', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/material-bundles/${bundleId1}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toMatch(/^DeleteBundleDeniedError: /);
      expect(respond.body.code).toBe(403);
    });
    it('should delete a materialbundle', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const respond1 = await request(app.getHttpServer())
        .delete(`/material-bundles/${bundleId2}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      //expect(respond.status).toBe(200);
      const respond2 = await request(app.getHttpServer())
        .get(`/material-bundles/${bundleId2}`)
        .send();
      expect(respond2.body.message).toMatch(/^BundleNotFoundError: /);
      expect(respond2.body.code).toBe(404);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});

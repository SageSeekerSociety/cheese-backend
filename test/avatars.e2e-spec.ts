import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
jest.mock('../src/users/email.service');

describe('Avatar Module', () => {
  let app: INestApplication;
  let AvatarId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000);
  describe('upload avatar', () => {
    it('should upload an avatar', async () => {
      const respond = await request(app.getHttpServer())
        .post('/avatars')
        .attach('avatar', 'src/avatars/resources/default.jpg');
      //.set('Authorization', `Bearer ${TestToken}`);
      expect(respond.status).toBe(201);
      expect(respond.body.message).toBe('Upload avatar successfully');
      expect(respond.body.data).toHaveProperty('avatarId');
      AvatarId = respond.body.data.avatarId;
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
        .get('/avatars/1000')
        .send();
      expect(respond.body.message).toContain('Avatar 1000 Not Found');
      expect(respond.status).toBe(404);
    });
  });
  describe('get default avatarID', () => {
    it('should get default avatarId', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/default/id')
        .send();
      expect(respond.status).toBe(200);
      //expect(respond.body.data.avatarId).toEqual(1);
    });
  });
  describe('get pre defined avatarIds', () => {
    it('should get pre defined avatarIds', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/predefined/id')
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.data.avatarIds.length).toEqual(3);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

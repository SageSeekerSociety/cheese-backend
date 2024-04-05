import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AvatarType } from '../src/avatars/avatars.legacy.entity';
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
        .attach('avatar', 'src/resources/avatars/default.jpg');
      //.set('Authorization', `Bearer ${TestToken}`);
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
      expect(respond.headers['content-type']).toEqual('image/*');
      expect(respond.headers['content-disposition']).toContain('attachment');
    });
    it('should return AvatarNotFoundError when an avatar is not found', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/1000')
        .send();
      expect(respond.body.message).toMatch(/^AvatarNotFoundError: /);
      expect(respond.status).toBe(404);
    });
  });
  describe('get default avatar', () => {
    it('should get default avatar', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/default')
        .send();
      expect(respond.status).toBe(200);
      expect(respond.headers['content-type']).toEqual('image/*');
      expect(respond.headers['content-disposition']).toContain('attachment');
    });
  });
  describe('get pre available avatarIds', () => {
    it('should get available avatarIds', async () => {
      const respond = await request(app.getHttpServer())
        .get('/avatars/')
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
        .query({ type: 'yuiiiiiii' })
        .send();
      expect(respond.status).toBe(400);
      expect(respond.body.message).toContain('Invalid Avatar type');
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

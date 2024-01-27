import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('Groups Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  const TestGroupCode = Math.floor(Math.random() * 10000000000).toString();
  const TestGroupPrefix = `[Test(${TestGroupCode}) Group]`;
  let TestToken: string;
  let TestUserId: number;
  let GroupIds: number[] = [];
  let auxAccessToken: string;

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

  beforeEach(() => jest.clearAllMocks());

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
    it('should create some groups', async () => {
      async function createGroup(name: string, intro: string, avatar: string) {
        const respond = await request(app.getHttpServer())
          .post('/groups')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({ name, intro, avatar });
        expect(respond.status).toBe(200);
        expect(respond.body.code).toBe(200);
        expect(respond.body.message).toBe('Group created successfully.');
        expect(respond.body.data.id).toBeDefined();
        GroupIds.push(respond.body.data.id);
      }
      await createGroup('数学之神膜膜喵', '不如原神', '🥸');
      await createGroup('ICS膜膜膜', 'pwb txdy!', '🐂');
      await createGroup('嘉然今天学什么', '学, 学个屁!', '🤡');
      await createGroup('XCPC, 启动!', '启不动了', '🐱');
    }, 80000);
    it('should create an auxiliary user', async () => {
      [, auxAccessToken] = await createAuxiliaryUser();
    });
  });

  describe('get groups', () => {
    it('should get all groups', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({ q: '', page_start: 0, page_size: 2, type: 'recommend' })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get groups successfully.');
      expect(respond.body.data.groups.length).toBe(4);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toBe('数学之神膜膜喵');
      expect(respond.body.data.groups[0].intro).toBe('不如原神');
      expect(respond.body.data.groups[0].avatar).toBe('🥸');
      expect(respond.body.data.groups[0].owner).toBe(TestUserId);
      expect(respond.body.data.groups[0].createdAt).toBeDefined();
      expect(respond.body.data.groups[0].updatedAt).toBeDefined();
      expect(respond.body.data.groups[0].members).toBe(1);
      expect(respond.body.data.groups[0].posts).toBe(0);
      expect(respond.body.data.groups[0].isMember).toBe(true);
      expect(respond.body.data.groups[0].isOwner).toBe(true);
      expect(respond.body.data.groups[1].id).toBeDefined();
      expect(respond.body.data.groups[1].name).toBe('ICS膜膜膜');
      expect(respond.body.data.groups[1].intro).toBe('pwb txdy!');
      expect(respond.body.data.groups[1].avatar).toBe('🐂');
      expect(respond.body.data.groups[1].owner).toBe(TestUserId);
      expect(respond.body.data.groups[1].createdAt).toBeDefined();
      expect(respond.body.data.groups[1].updatedAt).toBeDefined();
      expect(respond.body.data.groups[1].members).toBe(1);
      expect(respond.body.data.groups[1].posts).toBe(0);
      expect(respond.body.data.groups[1].isMember).toBe(true);
      expect(respond.body.data.groups[1].isOwner).toBe(true);
    });
    it('should get groups by name for another user', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({ q: '数学', page_start: 0, page_size: 2, type: 'search' })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get groups successfully.');
      expect(respond.body.data.groups.length).toBe(1);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toBe('数学之神膜膜喵');
      expect(respond.body.data.groups[0].intro).toBe('不如原神');
      expect(respond.body.data.groups[0].avatar).toBe('🥸');
      expect(respond.body.data.groups[0].owner).toBe(TestUserId);
      expect(respond.body.data.groups[0].createdAt).toBeDefined();
      expect(respond.body.data.groups[0].updatedAt).toBeDefined();
      expect(respond.body.data.groups[0].members).toBe(1);
      expect(respond.body.data.groups[0].posts).toBe(0);
      expect(respond.body.data.groups[0].isMember).toBe(false);
      expect(respond.body.data.groups[0].isOwner).toBe(false);
    });
    it('should get groups from half of the groups', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({
          q: '膜',
          page_start: GroupIds[1],
          page_size: 2,
          type: 'recommend',
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get groups successfully.');
      expect(respond.body.data.groups.length).toBe(1);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toBe('ICS膜膜膜');
      expect(respond.body.data.groups[0].intro).toBe('pwb txdy!');
      expect(respond.body.data.groups[0].avatar).toBe('🐂');
      expect(respond.body.data.groups[0].owner).toBe(TestUserId);
      expect(respond.body.data.groups[0].createdAt).toBeDefined();
      expect(respond.body.data.groups[0].updatedAt).toBeDefined();
      expect(respond.body.data.groups[0].members).toBe(1);
      expect(respond.body.data.groups[0].posts).toBe(0);
      expect(respond.body.data.groups[0].isMember).toBe(true);
      expect(respond.body.data.groups[0].isOwner).toBe(true);
    });
    it('should return empty array when no group is found', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({
          q: '嘉然',
          page_start: GroupIds[3],
          page_size: 2,
          type: 'search',
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get groups successfully.');
      expect(respond.body.data.groups.length).toBe(0);
    });
  });

  describe('get group', () => {
    const TestGroupId = GroupIds[0];
    it('should get a group', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get group successfully.');
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toBe('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toBe(TestUserId);
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.updatedAt).toBeDefined();
      expect(respond.body.data.members).toBe(1);
      expect(respond.body.data.posts).toBe(0);
      expect(respond.body.data.isMember).toBe(true);
      expect(respond.body.data.isOwner).toBe(true);
    });

    it('should get a group for another user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Get group successfully.');
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toBe('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toBe(TestUserId);
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.updatedAt).toBeDefined();
      expect(respond.body.data.members).toBe(1);
      expect(respond.body.data.posts).toBe(0);
      expect(respond.body.data.isMember).toBe(false);
      expect(respond.body.data.isOwner).toBe(false);
    });

    it('should return 404 when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId + 1}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
  });

  describe('join group', () => {
    const TestGroupId = GroupIds[0];
    it('should join a group', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Join group successfully.');
    });
    it('should return a group with isMember true', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toBe('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toBe(TestUserId);
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.updatedAt).toBeDefined();
      expect(respond.body.data.members).toBe(2);
      expect(respond.body.data.posts).toBe(0);
      expect(respond.body.data.isMember).toBe(true);
      expect(respond.body.data.isOwner).toBe(false);
    });
    it('should return 404 when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/groups/${TestGroupId + 1}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return 409 when user is already in the group', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
      expect(respond.body.message).toMatch(/^UserAlreadyInGroupError: /);
    });
  });

  describe('update group', () => {
    it('should update a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .patch(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: '关注huancheng谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Update group successfully.');
    });
    it('should return a group with updated info from another user', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toBe('关注huancheng谢谢喵');
      expect(respond.body.data.intro).toBe('湾原审万德');
      expect(respond.body.data.avatar).toBe('🤣');
      expect(respond.body.data.owner).toBe(TestUserId);
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.updatedAt).toBeDefined();
      expect(respond.body.data.members).toBe(2);
      expect(respond.body.data.posts).toBe(0);
      expect(respond.body.data.isMember).toBe(true);
      expect(respond.body.data.isOwner).toBe(false);
    });
    it('should return 404 when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .patch(`/groups/${GroupIds[0] + 1}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: '关注huancheng谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return 409 when group name is already used', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .patch(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: 'ICS膜膜膜',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
      expect(respond.body.message).toMatch(/^GroupNameAlreadyUsedError: /);
    });
    it('should return 409 when user is not the owner', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .patch(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          name: '关注huancheng谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.status).toBe(403);
      expect(respond.body.code).toBe(403);
      expect(respond.body.message).toMatch(/^CannotDeleteGroupError: /);
    });
  });

  describe('leave group', () => {
    const TestGroupId = GroupIds[0];
    it('should leave a group', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Leave group successfully.');
    });
    it('should return a group with isMember false', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toBe('关注huancheng谢谢喵');
      expect(respond.body.data.intro).toBe('湾原审万德');
      expect(respond.body.data.avatar).toBe('🤣');
      expect(respond.body.data.owner).toBe(TestUserId);
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.updatedAt).toBeDefined();
      expect(respond.body.data.members).toBe(1);
      expect(respond.body.data.posts).toBe(0);
      expect(respond.body.data.isMember).toBe(false);
      expect(respond.body.data.isOwner).toBe(false);
    });
    it('should return 404 when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId + 1}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return 409 when user is not in the group', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
      expect(respond.body.message).toMatch(/^UserNotInGroupError: /);
    });
    // todo: GroupOwnerCannotLeaveError
  });

  describe('delete group', () => {
    it('should delete a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.message).toBe('Delete group successfully.');
    });
    it('should return 404 after deletion', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return 404 when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${GroupIds[0] + 1}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return 409 when user is not the owner', async () => {
      const TestGroupId = GroupIds[1];
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.status).toBe(403);
      expect(respond.body.code).toBe(403);
      expect(respond.body.message).toMatch(/^CannotDeleteGroupError: /);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

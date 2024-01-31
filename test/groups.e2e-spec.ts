/*
 *  Description: This file tests the groups module.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

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
  let TestToken: string;
  let TestUserId: number;
  let TestUserDto: any;
  let GroupIds: number[] = [];
  const TestGroupPrefix = `G${Math.floor(Math.random() * 1000000)}`;
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
      TestUserDto = respond.body.data.user;
    });
    it('should create some groups', async () => {
      async function createGroup(name: string, intro: string, avatar: string) {
        const respond = await request(app.getHttpServer())
          .post('/groups')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({ name: TestGroupPrefix + name, intro, avatar });
        expect(respond.body.message).toBe('Group created successfully.');
        expect(respond.body.code).toBe(201);
        expect(respond.status).toBe(201);
        expect(respond.body.data.id).toBeTruthy();
        expect(respond.body.data.name).toContain(name);
        expect(respond.body.data.intro).toBe(intro);
        expect(respond.body.data.avatar).toBe(avatar);
        expect(respond.body.data.owner.id).toBe(TestUserId);
        expect(respond.body.data.created_at).toBeDefined();
        expect(respond.body.data.updated_at).toBeDefined();
        expect(respond.body.data.member_count).toBe(1);
        expect(respond.body.data.question_count).toBe(0);
        expect(respond.body.data.answer_count).toBe(0);
        expect(respond.body.data.is_member).toBe(true);
        expect(respond.body.data.is_owner).toBe(true);
        expect(respond.body.data.is_public).toBe(true);
        GroupIds.push(respond.body.data.id);
      }
      await createGroup('数学之神膜膜喵', '不如原神', '🥸');
      await createGroup('ICS膜膜膜', 'pwb txdy!', '🐂');
      await createGroup('嘉然今天学什么', '学, 学个屁!', '🤡');
      await createGroup('XCPC启动', '启不动了', '🐱');
    }, 80000);
    it('should create an auxiliary user', async () => {
      [, auxAccessToken] = await createAuxiliaryUser();
    });
  });

  describe('get groups', () => {
    it('should get all groups', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({ q: '', page_size: 2, type: 'new' })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Groups fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.groups.length).toBe(2);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toContain('XCPC启动');
      expect(respond.body.data.groups[0].intro).toBe('启不动了');
      expect(respond.body.data.groups[0].avatar).toBe('🐱');
      expect(respond.body.data.groups[0].owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.groups[0].created_at).toBeDefined();
      expect(respond.body.data.groups[0].updated_at).toBeDefined();
      expect(respond.body.data.groups[0].member_count).toBe(1);
      expect(respond.body.data.groups[0].question_count).toBe(0);
      expect(respond.body.data.groups[0].answer_count).toBe(0);
      expect(respond.body.data.groups[0].is_member).toBe(true);
      expect(respond.body.data.groups[0].is_owner).toBe(true);
      expect(respond.body.data.groups[1].id).toBeDefined();
      expect(respond.body.data.groups[1].name).toContain('嘉然今天学什么');
      expect(respond.body.data.groups[1].intro).toBe('学, 学个屁!');
      expect(respond.body.data.groups[1].avatar).toBe('🤡');
      expect(respond.body.data.groups[1].owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.groups[1].created_at).toBeDefined();
      expect(respond.body.data.groups[1].updated_at).toBeDefined();
      expect(respond.body.data.groups[1].member_count).toBe(1);
      expect(respond.body.data.groups[1].question_count).toBe(0);
      expect(respond.body.data.groups[1].answer_count).toBe(0);
      expect(respond.body.data.groups[1].is_member).toBe(true);
      expect(respond.body.data.groups[1].is_owner).toBe(true);
      expect(respond.body.data.page.page_start).toBe(GroupIds[3]);
      expect(respond.body.data.page.page_size).toBe(2);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBeFalsy();
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(GroupIds[1]);
    });
    it('should get groups by name for another user', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({ q: '数学', page_size: 2, type: 'new' })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Groups fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toContain('数学之神膜膜喵');
      expect(respond.body.data.groups[0].intro).toBe('不如原神');
      expect(respond.body.data.groups[0].avatar).toBe('🥸');
      expect(respond.body.data.groups[0].owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.groups[0].created_at).toBeDefined();
      expect(respond.body.data.groups[0].updated_at).toBeDefined();
      expect(respond.body.data.groups[0].member_count).toBe(1);
      expect(respond.body.data.groups[0].question_count).toBe(0);
      expect(respond.body.data.groups[0].answer_count).toBe(0);
      expect(respond.body.data.groups[0].is_member).toBe(false);
      expect(respond.body.data.groups[0].is_owner).toBe(false);
      expect(respond.body.data.page.page_start).toBe(GroupIds[0]);
      expect(respond.body.data.page.page_size).toBeLessThanOrEqual(2); // ! since tests are run multiple times
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBeFalsy();
      expect(respond.body.data.page.has_more).toBeDefined();
      expect(respond.body.data.page.next_start).toBeDefined();
    });
    it('should get groups from half of the groups', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({
          q: '膜',
          page_start: GroupIds[0],
          page_size: 2,
          type: 'new',
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Groups fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toContain('数学之神膜膜喵');
      expect(respond.body.data.groups[0].intro).toBe('不如原神');
      expect(respond.body.data.groups[0].avatar).toBe('🥸');
      expect(respond.body.data.groups[0].owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.groups[0].created_at).toBeDefined();
      expect(respond.body.data.groups[0].updated_at).toBeDefined();
      expect(respond.body.data.groups[0].member_count).toBe(1);
      expect(respond.body.data.groups[0].question_count).toBe(0);
      expect(respond.body.data.groups[0].answer_count).toBe(0);
      expect(respond.body.data.groups[0].is_member).toBe(true);
      expect(respond.body.data.groups[0].is_owner).toBe(true);
      expect(respond.body.data.groups[0].is_public).toBe(true);
      expect(respond.body.data.page.page_start).toBe(GroupIds[0]);
      expect(respond.body.data.page.page_size).toBeLessThanOrEqual(2); // ! since tests are run multiple times
      expect(respond.body.data.page.has_prev).toBe(true);
      expect(respond.body.data.page.prev_start).toBe(GroupIds[1]);
      expect(respond.body.data.page.has_more).toBeDefined();
      expect(respond.body.data.page.next_start).toBeDefined();
    });
    it('should return groups even page_start group not contains keyword', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({
          q: '嘉然',
          page_start: GroupIds[3],
          page_size: 1,
          type: 'new',
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Groups fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.groups.length).toBe(1);
      expect(respond.body.data.groups[0].id).toBeDefined();
      expect(respond.body.data.groups[0].name).toContain('嘉然今天学什么');
      expect(respond.body.data.groups[0].intro).toBe('学, 学个屁!');
      expect(respond.body.data.groups[0].avatar).toBe('🤡');
      expect(respond.body.data.groups[0].owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.groups[0].created_at).toBeDefined();
      expect(respond.body.data.groups[0].updated_at).toBeDefined();
      expect(respond.body.data.groups[0].member_count).toBe(1);
      expect(respond.body.data.groups[0].question_count).toBe(0);
      expect(respond.body.data.groups[0].answer_count).toBe(0);
      expect(respond.body.data.groups[0].is_member).toBe(true);
      expect(respond.body.data.groups[0].is_owner).toBe(true);
      expect(respond.body.data.groups[0].is_public).toBe(true);
      expect(respond.body.data.page.page_start).toBe(GroupIds[2]);
      expect(respond.body.data.page.page_size).toBe(1);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBeFalsy();
      expect(respond.body.data.page.has_more).toBeDefined();
      expect(respond.body.data.page.next_start).toBeDefined();
    });
    it('should return empty array when no group is found', async () => {
      const respond = await request(app.getHttpServer())
        .get('/groups')
        .query({
          q: '嘉然',
          page_start: 2, // ! since tests are run multiple times
          // ! be sure id = 2 exists
          page_size: 2,
          type: 'new',
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Groups fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.groups.length).toBe(0);
      expect(respond.body.data.page.page_start).toBe(0);
      expect(respond.body.data.page.page_size).toBe(0);
      expect(respond.body.data.page.has_prev).toBeDefined(); // ! since tests are run multiple times
      expect(respond.body.data.page.prev_start).toBeDefined();
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBeFalsy();
    });
  });

  describe('get group', () => {
    it('should get a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Group fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toContain('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.member_count).toBe(1);
      expect(respond.body.data.question_count).toBe(0);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.is_member).toBe(true);
      expect(respond.body.data.is_owner).toBe(true);
    });

    it('should get a group for another user', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Group fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toContain('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.member_count).toBe(1);
      expect(respond.body.data.question_count).toBe(0);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.is_member).toBe(false);
      expect(respond.body.data.is_owner).toBe(false);
    });

    it('should return GroupIdNotFoundError when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/groups/0`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
  });

  describe('join group', () => {
    it('should join a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .post(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ intro: '我是初音未来' });
      expect(respond.body.message).toBe('Joined group successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
    });
    it('should return a group with is_member true', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Group fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toContain('数学之神膜膜喵');
      expect(respond.body.data.intro).toBe('不如原神');
      expect(respond.body.data.avatar).toBe('🥸');
      expect(respond.body.data.owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.member_count).toBe(2);
      expect(respond.body.data.question_count).toBe(0);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.is_member).toBe(true);
      expect(respond.body.data.is_owner).toBe(false);
    });
    it('should return GroupIdNotFoundError when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/groups/0/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ intro: '我是初音未来' });
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return GroupAlreadyJoinedError when user is already in the group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .post(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ intro: '我是初音未来' });
      expect(respond.body.message).toMatch(/^GroupAlreadyJoinedError: /);
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
    });
  });

  describe('update group', () => {
    it('should update a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .put(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: TestGroupPrefix + '关注幻城谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.body.message).toBe('Group updated successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    });
    it('should return a group with updated info from another user', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Group fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toContain('关注幻城谢谢喵');
      expect(respond.body.data.intro).toBe('湾原审万德');
      expect(respond.body.data.avatar).toBe('🤣');
      expect(respond.body.data.owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.member_count).toBe(2);
      expect(respond.body.data.question_count).toBe(0);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.is_member).toBe(true);
      expect(respond.body.data.is_owner).toBe(false);
    });
    it('should return GroupIdNotFoundError when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .put('/groups/0')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: TestGroupPrefix + '关注幻城谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
    });
    it('should return GroupNameAlreadyUsedError when group name is already used', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .put(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          name: TestGroupPrefix + 'ICS膜膜膜',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.body.message).toMatch(/^GroupNameAlreadyUsedError: /);
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
    });
    // TODO: add permission control
    it('should return CannotDeleteGroupError when user is not the owner', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .put(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          name: TestGroupPrefix + '关注幻城谢谢喵',
          intro: '湾原审万德',
          avatar: '🤣',
        });
      expect(respond.body.message).toMatch(/^CannotDeleteGroupError: /);
      expect(respond.status).toBe(403);
      expect(respond.body.code).toBe(403);
    });
  });

  describe('leave group', () => {
    it('should leave a group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Quit group successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    });
    it('should return a group with is_member false', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Group fetched successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBe(TestGroupId);
      expect(respond.body.data.name).toContain('关注幻城谢谢喵');
      expect(respond.body.data.intro).toBe('湾原审万德');
      expect(respond.body.data.avatar).toBe('🤣');
      expect(respond.body.data.owner).toStrictEqual(TestUserDto);
      expect(respond.body.data.created_at).toBeDefined();
      expect(respond.body.data.updated_at).toBeDefined();
      expect(respond.body.data.member_count).toBe(1);
      expect(respond.body.data.question_count).toBe(0);
      expect(respond.body.data.answer_count).toBe(0);
      expect(respond.body.data.is_member).toBe(false);
      expect(respond.body.data.is_owner).toBe(false);
    });
    it('should return GroupIdNotFoundError when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/0/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    }, 10000);
    it('should return GroupNotJoinedError when user is not in the group', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}/members`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toMatch(/^GroupNotJoinedError: /);
      expect(respond.status).toBe(409);
      expect(respond.body.code).toBe(409);
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
      expect(respond.body.message).toBe('No Content.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    });
    it('should return GroupIdNotFoundError after deletion', async () => {
      const TestGroupId = GroupIds[0];
      const respond = await request(app.getHttpServer())
        .get(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return GroupIdNotFoundError when group is not found', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/groups/0`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/^GroupIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return CannotDeleteGroupError when user is not the owner', async () => {
      const TestGroupId = GroupIds[1];
      const respond = await request(app.getHttpServer())
        .delete(`/groups/${TestGroupId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toMatch(/^CannotDeleteGroupError: /);
      expect(respond.status).toBe(403);
      expect(respond.body.code).toBe(403);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

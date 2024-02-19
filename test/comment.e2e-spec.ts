import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('comments Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;

  let TestToken: string;
  let TestUserDto: any;
  let auxAccessToken: string;
  let auxUserDto: any;
  // for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let auxAdminAccessToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let auxAdminUserDto: any;
  const CommentIds: number[] = [];
  const TestCommentPrefix = `G${Math.floor(Math.random() * 1000000)}`;

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
    return [respond2.body.data.user, respond2.body.data.accessToken];
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
      TestUserDto = respond.body.data.user;
    });
    it('should create some comments', async () => {
      async function createComment(
        commentableId: number,
        commentableType: 'comment' | 'question' | 'answer',
        content: string,
      ) {
        const respond = await request(app.getHttpServer())
          .post('/comments')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({
            name: TestCommentPrefix + commentableId + commentableType + content,
          });
        expect(respond.body.message).toBe('Comment created succssfully');
        expect(respond.body.code).toBe(200);
        expect(respond.status).toBe(200);
        expect(respond.body.data.id).toBeTruthy();
        expect(respond.body.data.commentableId).toBe(commentableId);
        expect(respond.body.data.commentableType).toBe(commentableType);
        expect(respond.body.data.content).toContain(content);
        expect(respond.body.data.user).toStrictEqual(TestUserDto);
        expect(respond.body.data.created_at).toBeDefined();
        expect(respond.body.data.agree_type).toBe(0);
        expect(respond.body.data.agree_count).toBe(0);
        expect(respond.body.data.disagree_count).toBe(0);
        expect(respond.body.data.quote).toBeTruthy();
        CommentIds.push(respond.body.data.id);
      }
      await createComment(123, 'comment', 'zfgg好帅');
      await createComment(124432, 'question', 'zfggnb');
      await createComment(1223, 'answer', 'zfgg???????');
      await createComment(1234, 'comment', '宵宫!');
    }, 80000);
    it('should create some auxiliary users', async () => {
      [auxUserDto, auxAccessToken] = await createAuxiliaryUser();
      [auxAdminUserDto, auxAdminAccessToken] = await createAuxiliaryUser();
    });
    console.log('auxUserDto', auxUserDto);
    console.log('auxAccessToken', auxAccessToken);
    console.log('auxAdminUserDto', auxAdminUserDto);
    console.log('auxAdminAccessToken', auxAdminAccessToken);
  });

  describe('get Comments', () => {
    it('should get all comments', async () => {
      const respond = await request(app.getHttpServer())
        .get('/comments')
        .query({ q: '', page_size: 2, type: 'new' })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Get comments successfully');
      expect(respond.body.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.length).toBe(2);
      expect(respond.body.data.comment[0].commentableId).toBe(1234);
      expect(respond.body.data.comment[0].commentableType).toBe('comment');
      expect(respond.body.data.comment[0].content).toBe('宵宫!');
      expect(respond.body.data.comment[0].quote).toBeDefined();
      expect(respond.body.data.comment[0].id).toBeDefined();
      expect(respond.body.data.comment[0].created_at).toBeDefined();
      expect(respond.body.data.comment[0].agree_count).toBe(0);
      expect(respond.body.data.comment[0].disagree_count).toBe(0);
      expect(respond.body.data.comment[0].agree_type).toBe(0);
      expect(respond.body.data.comment[0].user).toStrictEqual(TestUserDto);
      expect(respond.body.data.comment[1].commentableId).toBe(1234);
      expect(respond.body.data.comment[1].commentableType).toBe('answer');
      expect(respond.body.data.comment[1].content).toBe('zfgg???????');
      expect(respond.body.data.comment[1].quote).toBeDefined();
      expect(respond.body.data.comment[1].id).toBeDefined();
      expect(respond.body.data.comment[1].created_at).toBeDefined();
      expect(respond.body.data.comment[1].agree_count).toBe(0);
      expect(respond.body.data.comment[1].disagree_count).toBe(0);
      expect(respond.body.data.comment[1].agree_type).toBe(0);
      expect(respond.body.data.comment[1].user).toStrictEqual(TestUserDto);
      expect(respond.body.data.page.page_start).toBe(CommentIds[3]);
      expect(respond.body.data.page.page_size).toBe(2);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBeFalsy();
      expect(respond.body.data.page.has_more).toBe(true);
      expect(respond.body.data.page.next_start).toBe(CommentIds[1]);
    });
  });

  describe('get comment list by id', () => {
    it('should get comments by id', async () => {
      const respond = await request(app.getHttpServer())
        .get('/comments')
        .query({
          q: '123',
          page_size: 2,
          type: 'new',
        })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.comments[0].id).toBeDefined();
      expect(respond.body.data.comments[0].commentableId).toBe(123);
      expect(respond.body.data.comments[0].commentableType).toBe('comment');
      expect(respond.body.data.comments[0].content).toBe('zfgg好帅');
      expect(respond.body.data.comments[0].user).toStrictEqual(TestUserDto);
      expect(respond.body.data.comments[0].created_at).toBeDefined();
      expect(respond.body.data.comments[0].disagree_count).toBe(0);
      expect(respond.body.data.comments[0].agree_count).toBe(0);
      expect(respond.body.data.comments[0].agree_type).toBe(0);
      expect(respond.body.data.comments[0].quote).toBeDefined();
      expect(respond.body.data.page.page_start).toBe(CommentIds[0]);
      expect(respond.body.data.page.page_size).toBeLessThanOrEqual(2); // ! since tests are run multiple times
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBeFalsy();
      expect(respond.body.data.page.has_more).toBeDefined();
      expect(respond.body.data.page.next_start).toBeDefined();
    });
  });

  describe('agreeComment', () => {
    it('should agree to a comment', async () => {
      const commentId = CommentIds[1]; // 假设 CommentIds 中存储了评论的 ID
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/agree`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Agree to comment successfully');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      // 可以根据具体情况验证其他返回数据
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const commentId = CommentIds[1]; // 假设 CommentIds 中存储了评论的 ID
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Delete comment successfully');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      // 可以根据具体情况验证其他返回数据
    });
  });
  afterAll(async () => {
    await app.close();
  });
});

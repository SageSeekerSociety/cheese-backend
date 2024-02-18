import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('Answers Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  const TestTopicCode = Math.floor(Math.random() * 10000000000).toString();
  const TestTopicPrefix = `[Test(${TestTopicCode}) Question]`;
  const TestQuestionCode = Math.floor(Math.random() * 10000000000).toString();
  const TestQuestionPrefix = `[Test(${TestQuestionCode}) Question]`;
  const TestAnswerCode = Math.floor(Math.random() * 10000000000).toString();
  const TestAnswerPrefix = `[Test(${TestAnswerCode}) Question]`;
  let TestToken: string;
  let TestUserId: number;
  const TopicIds: number[] = [];
  const questionId: number[] = [];
  let auxUserId: number;
  let auxAccessToken: string;
  const answerId: number[] = [];

  async function createAuxiliaryUser(): Promise<[number, string]> {
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
    });
    it('should create some topics', async () => {
      async function createTopic(name: string) {
        const respond = await request(app.getHttpServer())
          .post('/topics')
          .set('authorization', 'Bearer ' + TestToken)
          .send({
            name: `${TestTopicPrefix} ${name}`,
          });
        expect(respond.body.message).toBe('OK');
        expect(respond.status).toBe(201);
        expect(respond.body.code).toBe(201);
        TopicIds.push(respond.body.data.id);
      }
      await createTopic('数学');
      await createTopic('哥德巴赫猜想');
      await createTopic('钓鱼');
    }, 60000);
    it('should create some questions', async () => {
      async function createQuestion(title: string, content: string) {
        const respond = await request(app.getHttpServer())
          .post('/questions')
          .set('Authorization', `Bearer ${TestToken}`)
          .send({
            title: `${TestQuestionPrefix} ${title}`,
            content,
            type: 0,
            topics: [TopicIds[0], TopicIds[1]],
          });
        expect(respond.body.message).toBe('Created');
        expect(respond.body.code).toBe(201);
        expect(respond.status).toBe(201);
        expect(respond.body.data.id).toBeDefined();
        questionId.push(respond.body.data.id);
      }
      await createQuestion(
        '我这个哥德巴赫猜想的证明对吗？',
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      it('should create an auxiliary user', async () => {
        [auxUserId, auxAccessToken] = await createAuxiliaryUser();
      });
    });

    describe('create answer', () => {
      it('should create some answers', async () => {
        async function createAnswer(title: string, content: string) {
          const respond = await request(app.getHttpServer())
            .post('/answer')
            .set('Authorization', `Bearer ${TestToken}`)
            .send({
              questionId,
              title: `${TestAnswerPrefix} ${title}`,
              content,
            });
          expect(respond.body.message).toBe('Created');
          expect(respond.body.code).toBe(201);
          expect(respond.status).toBe(201);
          expect(respond.body.data.id).toBeDefined();
          answerId.push(respond.body.data.id);
        }
        await createAnswer(
          '哥德巴赫猜想',
          '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏...',
        );
        await Promise.all([
          createAnswer('回题主', '难道你真的是天才？'),
          createAnswer('？？？', '你不要胡说，1+1明明等于3'),
          createAnswer('Answer title with emoji: 😂😂', 'content'),
          createAnswer('title', 'Answer content with emoji: 😂😂'),
          createAnswer('long answer', '烫烫烫'.repeat(10000)),
        ]);
      }, 60000);
    });
  });

  describe('Get Answers By Question ID', () => {
    it('should successfully get answers by question ID', async () => {
      const page = 1;
      const limit = 2;
      const sortBy = 'createdAt'; // 根据实际排序字段调整
      const response = await request(app.getHttpServer())
        .get(`/answers/question/${questionId}/answers`)
        .query({ page, limit, sortBy })
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(limit);
      // 确认排序逻辑，假设第一个答案的创建时间晚于第二个
      expect(
        new Date(response.body[0].createdAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(response.body[1].createdAt).getTime());
    });

    it('should return an empty list for a non-existent question ID', async () => {
      const nonExistentQuestionId = '9999'; // Assuming this ID does not exist
      const response = await request(app.getHttpServer())
        .get(`/answers/question/${nonExistentQuestionId}/answers`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('Agree Answer', () => {
    it('should successfully agree to an answer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/answers/${answerId}/agree`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ agreeType: 1 });
      expect(response.status).toBe(200);
      expect(response.body.data.agree_count).toBe(1);
      expect(response.body.data.agrees).toContain(userId);
    });

    it('should throw AnswerAlreadyAgreeError when trying to agree again', async () => {
      const response = await request(app.getHttpServer())
        .post(`/answers/${answerId}/agree`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ userId });
      expect(response.status).toBe(400); // Assuming your application throws a 400 for this scenario
      expect(response.body.message).toMatch(/AnswerAlreadyAgreeError/);
    });

    it('should throw AnswerNotFoundError when trying to agree to a non-existent answer', async () => {
      const nonExistentAnswerId = 9999; // Assuming this ID does not exist
      const response = await request(app.getHttpServer())
        .post(`/answers/${nonExistentAnswerId}/agree`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ userId });
      expect(response.status).toBe(404); // Assuming your application throws a 404 for not found answers
      expect(response.body.message).toMatch(/AnswerNotFoundError/);
    });
  });

  describe('Favorite Answer', () => {
    it('should successfully favorite an answer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/answers/${answerId}/favorite`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ userId });
      expect(response.status).toBe(200);
      expect(response.body.data.favorite_count).toBe(1);
      expect(response.body.data.is_favorite).toBe(true);
      expect(response.body.data.favoritedBy).toContain(userId);
    });

    it('should throw AnswerAlreadyFavoriteError when trying to favorite again', async () => {
      const response = await request(app.getHttpServer())
        .post(`/answers/${answerId}/favorite`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ userId });
      expect(response.status).toBe(400); // Assuming your application throws a 400 for this scenario
      expect(response.body.message).toMatch(/AnswerAlreadyFavoriteError/);
    });

    it('should throw AnswerNotFoundError when trying to favorite a non-existent answer', async () => {
      const nonExistentAnswerId = 9999; // Assuming this ID does not exist
      const response = await request(app.getHttpServer())
        .post(`/answers/${nonExistentAnswerId}/favorite`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ userId });
      expect(response.status).toBe(404); // Assuming your application throws a 404 for not found answers
      expect(response.body.message).toMatch(/AnswerNotFoundError/);
    });
  });

  describe('Update Answer', () => {
    it('should successfully update an answer', async () => {
      const updatedContent = '--------更新----------';
      const response = await request(app.getHttpServer())
        .put(`/answers/${answerId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ content: updatedContent });
      expect(response.status).toBe(200);
      expect(response.body.data.content).toEqual(updatedContent);
    });

    it('should throw AnswerNotFoundError when trying to update a non-existent answer', async () => {
      const nonExistentAnswerId = 9999; // Assuming this ID does not exist
      const response = await request(app.getHttpServer())
        .put(`/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ content: 'Some content' });
      expect(response.status).toBe(404); // Assuming your application throws a 404 for not found answers
      expect(response.body.message).toMatch(/AnswerNotFoundError/);
    });
  });

  describe('Delete Answer (e2e)', () => {
    it('should successfully delete an answer', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/answers/${answerId}`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.status).toBe(200);

      // 验证答案是否确实被删除
      const verifyResponse = await request(app.getHttpServer())
        .get(`/answers/${answerId}`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(verifyResponse.status).toBe(404);
    });

    it('should return a not found error when trying to delete a non-existent answer', async () => {
      const nonExistentAnswerId = 9999; // 假设这个ID不存在
      const response = await request(app.getHttpServer())
        .delete(`/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.status).toBe(404); // 假设删除不存在的答案返回404
    });
  });

  afterAll(async () => {
    await app.close();
  });
<<<<<<< HEAD
});
=======
});
>>>>>>> dev/dev-hmx

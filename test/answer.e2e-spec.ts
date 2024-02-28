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
  // const TestAnswerCode = Math.floor(Math.random() * 10000000000).toString();
  // const TestAnswerPrefix = `[Test(${TestAnswerCode}) Question]`;
  let TestToken: string;
  // let TestUserId: number;
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
      // TestUserId = respond.body.data.user.id;
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
    });

    it('should create an auxiliary user', async () => {
      [auxUserId, auxAccessToken] = await createAuxiliaryUser();
    });
  });

  // describe('answer question', () => {
  it('should create some answers', async () => {
    const testQuestionId = questionId[0];
    async function createAnswer(content: string) {
      const respond = await request(app.getHttpServer())
        //这个地方建议就是把API修改一下，你传参的时候就直接按你这个post传，然后就不需要send
        //没事了，API没搞错，然后下面requestBody不是只传一个content吗
        .post(`/question/${testQuestionId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({
          content: content,
        });
      expect(respond.body.message).toBe('Answer created successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.status).toBe(201);
      expect(typeof respond.body.data.id).toBe('number');
      answerId.push(respond.body.data.id);
    }
    await createAnswer(
      '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏，后面忘了',
    ); // this should be firstly executed and will be checked further
    await Promise.all([
      createAnswer('难道你真的是天才？'),
      createAnswer('你不要胡说，1+1明明等于3'),
      createAnswer('Answer content with emoji: 😂😂'),
      createAnswer('烫烫烫'.repeat(1000)),
    ]);
  }, 6000);
  // });
  // });

  describe('Get answer', () => {
    it('should get a answer', async () => {
      const TestQuestionId = questionId[0];
      const TestAnswerId = answerId[0];
      const response = await request(app.getHttpServer())
        .get(`/question/${TestQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answer fetched successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);

      expect(response.body.data.id).toBe(TestAnswerId);
      expect(response.body.data.question_id).toBe(TestQuestionId);
      expect(response.body.data.content).toContain(
        '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏，',
      );
    });
    it('should return AnswerNotFoundError', async () => {
      const TestQuestionId = questionId[0];
      const NotExistAnswerId = 999999;
      const response = await request(app.getHttpServer())
        .get(`/question/${TestQuestionId}/answers/${NotExistAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });
  });

  describe('Get Answers By Question ID', () => {
    it('should successfully get all answers by question ID', async () => {
      const TestQuestionId = questionId[0];
      const pageStart = answerId[0];
      const pageSize = 20;
      const response = await request(app.getHttpServer())
        .get(`/question/${TestQuestionId}/answers`)
        .query({
          questionId: TestQuestionId,
          page_start: pageStart,
          page_size: pageSize,
        })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answers fetched successfully.');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(pageStart);
      // expect(response.body.data.page.page_size).toBe(20);
      // expect(response.body.data.page.has_prev).toBe(true);
      // expect(response.body.data.page.prev_start).toBeFalsy();
      // expect(response.body.data.page.has_more).toBe(false);
      // expect(response.body.data.page.next_start).toBe(answerId[1]);
      // expect(response.body.data.answers.question_id).toBe(TestQuestionId);
    });

    it('should return an empty list for a non-existent question ID', async () => {
      const nonExistentQuestionId = 99999;
      const response = await request(app.getHttpServer())
        .get(`/question/${nonExistentQuestionId}/answers`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.body.message).toBe('Answers fetched successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
    });
  });

  describe('Update Answer', () => {
    it('should successfully update an answer', async () => {
      const testQuestionId = questionId[0];
      const testAnswerId = answerId[1];
      const updatedContent = '--------更新----------';
      const response = await request(app.getHttpServer())
        .put(`/question/${testQuestionId}/answers/${testAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content: updatedContent });
      expect(response.body.message).toBe('Answer updated successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
    });

    it('should throw AnswerNotFoundError when trying to update a non-existent answer', async () => {
      const nonExistentAnswerId = 0;
      const testQuestionId = questionId[0];
      const response = await request(app.getHttpServer())
        .put(`/question/${testQuestionId}/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content: 'Some content' });
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });
  });

  describe('Delete Answer', () => {
    it('should successfully delete an answer', async () => {
      const testQuestionId = questionId[0];
      const TestAnswerId = answerId[2];
      const response = await request(app.getHttpServer())
        .delete(`/question/${testQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`);

      expect(response.body.message).toBe('Answer deleted successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
    });

    it('should return a not found error when trying to delete a non-existent answer', async () => {
      const testQuestionId = questionId[0];
      const nonExistentAnswerId = 0;
      const response = await request(app.getHttpServer())
        .delete(`/question/${testQuestionId}/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`);

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });
  });

  describe('Agree Answer', () => {
    it('should successfully create user attitude on first attempt', async () => {
      const TestQuestionId = questionId[0];
      const TestAnswerId = answerId[1];
      const response = await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/agree`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ id: TestAnswerId, userId: auxUserId, agree_type: 1 });
      expect(response.body.message).toBe('Answer agreed successfully.');
      expect(response.statusCode).toBe(200);
      expect(response.body.userAttitudeRepository).toBeUndefined();
      expect(response.body.code).toBe(200);
      expect(response.body.data.agree_count).toBe(1);
      expect(response.body.data.disagree_count).toBe(0);
      expect(response.body.data.question_id).toBe(TestQuestionId);
    });

    it('should successfully agree to an answer', async () => {
      const TestQuestionId = questionId[0];
      const TestAnswerId = answerId[3];
      const response = await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/agree`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ id: TestAnswerId, userId: auxUserId, agree_type: 1 });
      expect(response.body.message).toBe('Answer agreed successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.agree_count).toBe(1);
      expect(response.body.data.disagree_count).toBe(0);
      expect(response.body.data.question_id).toBe(TestQuestionId);
    });

    it('should throw AlreadyHasSameAttitudeError when trying to agree again', async () => {
      const TestQuestionId = questionId[0];
      const TestAnswerId = answerId[3];
      await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/agree`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ id: TestAnswerId, userId: auxUserId, agree_type: 2 });
      const response = await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/agree`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ id: TestAnswerId, userId: auxUserId, agree_type: 2 });
      expect(response.body.message).toMatch(/AlreadyHasSameAttitudeError: /);
      expect(response.status).toBe(400);
    });

    it('should throw AnswerNotFoundError when trying to agree to a non-existent answer', async () => {
      const nonExistentAnswerId = 9999; // Assuming this ID does not exist
      const TestQuestionId = questionId[0];
      const response = await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${nonExistentAnswerId}/agree`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ agree_type: 1 });
      expect(response.body.message).toMatch(/AnswerNotFoundError/);
      expect(response.status).toBe(404); // Assuming your application throws a 404 for not found answers
    });
  });

  describe('Favorite Answer', () => {
    it('should successfully favorite an answer', async () => {
      const TestAnswerId = answerId[1];
      const TestQuestionId = questionId[0];
      const response = await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answer favorited successfully.');
      expect(response.status).toBe(200);
      expect(response.body.data.answer.favorite_count).toBe(1);
    });

    it('should successfully unfavorite an answer', async () => {
      const TestAnswerId = answerId[1];
      const TestQuestionId = questionId[0];
      await request(app.getHttpServer())
        .put(`/question/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      const response = await request(app.getHttpServer())
        .delete(`/question/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('No Content.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
    });

    it('should throw AnswerNotFavoriteError when trying to unfavorite an answer that has not been favorited yet', async () => {
      const TestAnswerId = answerId[4];
      const TestQuestionId = questionId[0];
      const response = await request(app.getHttpServer())
        .delete(`/question/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/AnswerNotFavoriteError: /);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(400);
    });
    it('should throw AnswerNotFoundError when trying to favorite a non-existent answer', async () => {
      // const TestAnswerId = answerId[0];
      const TestQuestionId = questionId[0];
      const nonExistentAnswerId = 99999;
      const response = await request(app.getHttpServer())
        .put(
          `/question/${TestQuestionId}/answers/${nonExistentAnswerId}/favorite`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);

      expect(response.body.code).toBe(404);
    });
    it('should throw AnswerNotFoundError when trying to unfavorite a non-existent answer', async () => {
      // const TestAnswerId = answerId[0];
      const TestQuestionId = questionId[0];
      const nonExistentAnswerId = 99998;
      const response = await request(app.getHttpServer())
        .delete(
          `/question/${TestQuestionId}/answers/${nonExistentAnswerId}/favorite`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);

      expect(response.body.code).toBe(404);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

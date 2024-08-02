import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
jest.mock('../src/email/email.service');

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
  let TestToken: string;
  let TestUserId: number;
  const TopicIds: number[] = [];
  const questionIds: number[] = [];
  const answerIds: number[] = [];
  const AnswerQuestionMap: { [key: number]: number } = {};
  const userIdTokenPairList: [number, string][] = [];
  let auxUserId: number;
  let auxAccessToken: string;
  let specialQuestionId: number;
  const specialAnswerIds: number[] = [];
  const auxUserAskedAnswerIds: number[] = [];

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
        questionIds.push(respond.body.data.id);
      }

      await createQuestion(
        '我这个哥德巴赫猜想的证明对吗？',
        '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
      );
      await createQuestion('求助', '给指导老师分配了任务，老师不干活怎么办？');
      await createQuestion('提问', '应该给指导老师分配什么任务啊');
      await createQuestion('不懂就问', '忘记给指导老师分配任务了怎么办');
      await createQuestion('小创求捞', '副教授职称，靠谱不鸽，求本科生带飞');
      await createQuestion('大创', '极限捞人');
    });
    it('should create some auxiliary users', async () => {
      [auxUserId, auxAccessToken] = await createAuxiliaryUser();
      userIdTokenPairList.push([auxUserId, auxAccessToken]);
      for (let i = 0; i < 5; i++) {
        userIdTokenPairList.push(await createAuxiliaryUser());
      }

      expect(userIdTokenPairList.length).toBe(6);
    });
  });

  describe('Answer question', () => {
    it('should create some answers', async () => {
      async function createAnswer(
        questionId: number,
        content: string,
        userId: number,
        auxToken: string,
      ): Promise<number> {
        const respond = await request(app.getHttpServer())
          .post(`/questions/${questionId}/answers`)
          .set('Authorization', `Bearer ${auxToken}`)
          .send({ content });
        expect(respond.body.message).toBe('Answer created successfully.');
        expect(respond.body.code).toBe(201);
        expect(respond.status).toBe(201);
        expect(typeof respond.body.data.id).toBe('number');
        answerIds.push(respond.body.data.id);
        AnswerQuestionMap[respond.body.data.id] = questionId;
        if (userId == auxUserId)
          auxUserAskedAnswerIds.push(respond.body.data.id);
        return respond.body.data.id;
      }

      const answerContents1 = [
        '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏，后面忘了',
        '难道你真的是天才？',
        '1+1明明等于3',
        'Answer content with emoji: 😂😂',
        '烫烫烫'.repeat(1000),
      ];
      for (let i = 0; i < 5; i++) {
        await createAnswer(
          questionIds[i],
          answerContents1[i],
          auxUserId,
          auxAccessToken,
        );
      }

      const answerContents2 = [
        'answer1',
        'answer2',
        'answer3',
        'answer4',
        'answer5',
        'answer6',
      ];
      specialQuestionId = questionIds[5];
      for (let i = 0; i < 6; i++) {
        const id = await createAnswer(
          questionIds[5],
          answerContents2[i],
          userIdTokenPairList[i][0],
          userIdTokenPairList[i][1],
        );
        specialAnswerIds.push(id);
      }
    }, 60000);
    it('should return QuestionAlreadyAnsweredError when user answer the same question', async () => {
      const TestQuestionId = questionIds[0];
      const content = 'content';
      await request(app.getHttpServer())
        .post(`/questions/${TestQuestionId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content });
      const respond = await request(app.getHttpServer())
        .post(`/questions/${TestQuestionId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content });
      expect(respond.body.message).toMatch(/QuestionAlreadyAnsweredError: /);
      expect(respond.body.code).toBe(400);
    });
    it('should return updated statistic info when getting user who not log in', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${auxUserId}`)
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.data.user.answer_count).toBe(6);
    });
    it('should return updated statistic info when getting user', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${auxUserId}`)
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.data.user.answer_count).toBe(6);
    });
    it('should return AuthenticationRequiredError', async () => {
      const TestQuestionId = questionIds[0];
      const content = 'content';
      const respond = await request(app.getHttpServer())
        .post(`/questions/${TestQuestionId}/answers`)
        .send({ content });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('Get answer', () => {
    it('should get a answer', async () => {
      const TestAnswerId = answerIds[0];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .get(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answer fetched successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.question.id).toBe(TestQuestionId);
      expect(response.body.data.question.title).toBeDefined();
      expect(response.body.data.question.content).toBeDefined();
      expect(response.body.data.question.author).toBeDefined();
      expect(response.body.data.answer.id).toBe(TestAnswerId);
      expect(response.body.data.answer.question_id).toBe(TestQuestionId);
      expect(response.body.data.answer.content).toContain(
        '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏，',
      );
      expect(response.body.data.answer.author.id).toBe(auxUserId);
      expect(response.body.data.answer.created_at).toBeDefined();
      expect(response.body.data.answer.updated_at).toBeDefined();
      expect(response.body.data.answer.attitudes).toBeDefined();
      expect(response.body.data.answer.attitudes.positive_count).toBe(0);
      expect(response.body.data.answer.attitudes.negative_count).toBe(0);
      expect(response.body.data.answer.attitudes.difference).toBe(0);
      expect(response.body.data.answer.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
      expect(response.body.data.answer.is_favorite).toBe(false);
      expect(response.body.data.answer.comment_count).toBe(0);
      expect(response.body.data.answer.favorite_count).toBe(0);
      expect(response.body.data.answer.view_count).toBeDefined();
      expect(response.body.data.answer.is_group).toBe(false);
    });
    // it('should get a answer even without token', async () => {
    //   // const TestQuestionId = questionId[0];
    //   const TestAnswerId = answerIds[0];
    //   const TestQuestionId = AnswerQuestionMap[TestAnswerId];
    //   const response = await request(app.getHttpServer())
    //     .get(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
    //     .send();
    //   expect(response.body.message).toBe('Answer fetched successfully.');
    //   expect(response.status).toBe(200);
    //   expect(response.body.code).toBe(200);
    //   expect(response.body.data.question.id).toBe(TestQuestionId);
    //   expect(response.body.data.question.title).toBeDefined();
    //   expect(response.body.data.question.content).toBeDefined();
    //   expect(response.body.data.question.author.id).toBe(TestUserId);
    //   expect(response.body.data.answer.id).toBe(TestAnswerId);
    //   expect(response.body.data.answer.question_id).toBe(TestQuestionId);
    //   expect(response.body.data.answer.content).toContain(
    //     '你说得对，但是原神是一款由米哈游自主研发的开放世界游戏，',
    //   );
    //   expect(response.body.data.answer.author.id).toBe(auxUserId);
    //   expect(response.body.data.answer.created_at).toBeDefined();
    //   expect(response.body.data.answer.updated_at).toBeDefined();
    //   //expect(response.body.data.answer.agree_type).toBe(0);
    //   expect(response.body.data.answer.is_favorite).toBe(false);
    //   //expect(response.body.data.answer.agree_count).toBe(0);
    //   expect(response.body.data.answer.favorite_count).toBe(0);
    //   expect(response.body.data.answer.view_count).toBeDefined();
    // });

    it('should return AnswerNotFoundError', async () => {
      const TestAnswerId = answerIds[0];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId] + 1;
      const response = await request(app.getHttpServer())
        .get(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });

    it('should return AuthenticationRequiredError', async () => {
      const TestAnswerId = answerIds[0];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .get(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
        // .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
  });

  describe('Get Answers By Question ID', () => {
    it('should successfully get all answers by question ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answers fetched successfully.');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(specialAnswerIds[0]);
      expect(response.body.data.page.page_size).toBe(specialAnswerIds.length);
      expect(response.body.data.page.has_prev).toBe(false);
      expect(response.body.data.page.prev_start).toBe(0);
      expect(response.body.data.page.has_more).toBe(false);
      expect(response.body.data.page.next_start).toBe(0);
      expect(response.body.data.answers.length).toBe(specialAnswerIds.length);
      for (let i = 0; i < specialAnswerIds.length; i++) {
        expect(response.body.data.answers[i].question_id).toBe(
          specialQuestionId,
        );
      }
      expect(
        response.body.data.answers
          .map((x: any) => x.id)
          .sort((n1: number, n2: number) => n1 - n2),
      ).toStrictEqual(specialAnswerIds);
    });

    it('should successfully get all answers by question ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answers fetched successfully.');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(specialAnswerIds[0]);
      expect(response.body.data.page.page_size).toBe(specialAnswerIds.length);
      expect(response.body.data.page.has_prev).toBe(false);
      expect(response.body.data.page.prev_start).toBe(0);
      expect(response.body.data.page.has_more).toBe(false);
      expect(response.body.data.page.next_start).toBe(0);
      expect(response.body.data.answers.length).toBe(specialAnswerIds.length);
      for (let i = 0; i < specialAnswerIds.length; i++) {
        expect(response.body.data.answers[i].question_id).toBe(
          specialQuestionId,
        );
      }
      expect(
        response.body.data.answers
          .map((x: any) => x.id)
          .sort((n1: number, n2: number) => n1 - n2),
      ).toStrictEqual(specialAnswerIds);
    });

    it('should successfully get all answers by question ID', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const pageStart = specialAnswerIds[0];
      const pageSize = 20;
      const response = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers`)
        .query({
          page_start: pageStart,
          page_size: pageSize,
        })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answers fetched successfully.');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      // expect(response.body.data.page.page_start).toBe(pageStart);
      expect(response.body.data.page.page_size).toBe(specialAnswerIds.length);
      expect(response.body.data.page.has_prev).toBe(false);
      expect(response.body.data.page.prev_start).toBe(0);
      expect(response.body.data.page.has_more).toBe(false);
      expect(response.body.data.page.next_start).toBe(0);
      expect(response.body.data.answers.length).toBe(specialAnswerIds.length);
      for (let i = 0; i < specialAnswerIds.length; i++) {
        expect(response.body.data.answers[i].question_id).toBe(
          specialQuestionId,
        );
      }
      expect(
        response.body.data.answers
          .map((x: any) => x.id)
          .sort((n1: number, n2: number) => n1 - n2),
      ).toStrictEqual(specialAnswerIds);
    });

    it('should successfully get answers by question ID and paging', async () => {
      const pageSize = 2;
      const response = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers`)
        .query({
          page_start: specialAnswerIds[2],
          page_size: pageSize,
        })
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toBe('Answers fetched successfully.');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(specialAnswerIds[2]);
      expect(response.body.data.page.page_size).toBe(2);
      expect(response.body.data.page.has_prev).toBe(true);
      expect(response.body.data.page.prev_start).toBe(specialAnswerIds[0]);
      expect(response.body.data.page.has_more).toBe(true);
      expect(response.body.data.page.next_start).toBe(specialAnswerIds[4]);
      expect(response.body.data.answers.length).toBe(2);
      expect(response.body.data.answers[0].question_id).toBe(specialQuestionId);
      expect(response.body.data.answers[1].question_id).toBe(specialQuestionId);
      expect(response.body.data.answers[0].id).toBe(specialAnswerIds[2]);
      expect(response.body.data.answers[1].id).toBe(specialAnswerIds[3]);
    });

    // it('should successfully get answers by question ID without token', async () => {
    //   const pageSize = 2;
    //   const response = await request(app.getHttpServer())
    //     .get(`/questions/${specialQuestionId}/answers`)
    //     .query({
    //       page_start: specialAnswerIds[2],
    //       page_size: pageSize,
    //     })
    //     .send();

    //   expect(response.body.message).toBe('Answers fetched successfully.');

    //   expect(response.status).toBe(200);
    //   expect(response.body.code).toBe(200);
    //   expect(response.body.data.page.page_start).toBe(specialAnswerIds[2]);
    //   expect(response.body.data.page.page_size).toBe(2);
    //   expect(response.body.data.page.has_prev).toBe(true);
    //   expect(response.body.data.page.prev_start).toBe(specialAnswerIds[0]);
    //   expect(response.body.data.page.has_more).toBe(true);
    //   expect(response.body.data.page.next_start).toBe(specialAnswerIds[4]);
    //   expect(response.body.data.answers.length).toBe(2);
    //   expect(response.body.data.answers[0].question_id).toBe(specialQuestionId);
    //   expect(response.body.data.answers[1].question_id).toBe(specialQuestionId);
    //   expect(response.body.data.answers[0].id).toBe(specialAnswerIds[2]);
    //   expect(response.body.data.answers[1].id).toBe(specialAnswerIds[3]);
    // });

    it('should return QuestionNotFoundError for a non-existent question ID', async () => {
      const nonExistentQuestionId = 99999;
      const response = await request(app.getHttpServer())
        .get(`/questions/${nonExistentQuestionId}/answers`)
        .set('Authorization', `Bearer ${TestToken}`);
      expect(response.body.message).toMatch(/QuestionNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });

    it('should return AuthenticationRequiredError', async () => {
      const response = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers`)
        // .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
  });

  describe('Get Answers By Asker ID', () => {
    it('should return UserIdNotFoundError', async () => {
      const noneExistUserId = -1;
      const respond = await request(app.getHttpServer())
        .get(`/users/${noneExistUserId}/answers`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toMatch(/UserIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should get answers asked by auxUser with default page settings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/answers`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Query asked questions successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(auxUserAskedAnswerIds[0]);
      expect(response.body.data.page.page_size).toBe(
        auxUserAskedAnswerIds.length,
      );
      expect(response.body.data.page.has_prev).toBe(false);
      expect(response.body.data.page.prev_start).toBe(0);
      expect(response.body.data.page.has_more).toBe(false);
      expect(response.body.data.page.next_start).toBe(0);
      expect(response.body.data.answers.length).toBe(
        auxUserAskedAnswerIds.length,
      );
      for (let i = 0; i < auxUserAskedAnswerIds.length; i++) {
        expect(response.body.data.answers[i].id).toBe(auxUserAskedAnswerIds[i]);
      }
    });
    it('should get answers asked by auxUser with a page setting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/answers`)
        .query({
          page_start: auxUserAskedAnswerIds[0],
          page_size: 2,
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(response.body.message).toBe('Query asked questions successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(auxUserAskedAnswerIds[0]);
      expect(response.body.data.page.page_size).toBe(2);
      expect(response.body.data.page.has_prev).toBe(false);
      expect(response.body.data.page.prev_start).toBe(0);
      expect(response.body.data.page.has_more).toBe(true);
      expect(response.body.data.page.next_start).toBe(auxUserAskedAnswerIds[2]);
      expect(response.body.data.answers.length).toBe(2);
      expect(response.body.data.answers[0].id).toBe(auxUserAskedAnswerIds[0]);
      expect(response.body.data.answers[1].id).toBe(auxUserAskedAnswerIds[1]);
    });
    it('should get answers asked by auxUser with another page setting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/answers`)
        .query({
          page_start: auxUserAskedAnswerIds[2],
          page_size: 2,
        })
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(response.body.message).toBe('Query asked questions successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.page.page_start).toBe(auxUserAskedAnswerIds[2]);
      expect(response.body.data.page.page_size).toBe(2);
      expect(response.body.data.page.has_prev).toBe(true);
      expect(response.body.data.page.prev_start).toBe(auxUserAskedAnswerIds[0]);
      expect(response.body.data.page.has_more).toBe(true);
      expect(response.body.data.page.next_start).toBe(auxUserAskedAnswerIds[4]);
      expect(response.body.data.answers.length).toBe(2);
      expect(response.body.data.answers[0].id).toBe(auxUserAskedAnswerIds[2]);
      expect(response.body.data.answers[1].id).toBe(auxUserAskedAnswerIds[3]);
    });
    it('should return AuthenticationRequiredError', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${auxUserId}/answers`)
        .send();
      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
  });

  describe('Update Answer', () => {
    it('should return PermissionDeniedError', async () => {
      const TestAnswerId = answerIds[0];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .put(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ content: 'Some content' });
      expect(response.body.message).toMatch(/PermissionDeniedError: /);
      expect(response.body.code).toBe(403);
    });
    it('should successfully update an answer', async () => {
      const testAnswerId = answerIds[1];
      const testQuestionId = AnswerQuestionMap[testAnswerId];
      const updatedContent = '--------更新----------';
      const response = await request(app.getHttpServer())
        .put(`/questions/${testQuestionId}/answers/${testAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content: updatedContent });
      expect(response.body.message).toBe('Answer updated successfully.');
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
    });

    it('should throw AnswerNotFoundError when trying to update a non-existent answer', async () => {
      const nonExistentAnswerId = 999999;
      const testQuestionId = questionIds[0];
      const response = await request(app.getHttpServer())
        .put(`/questions/${testQuestionId}/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content: 'Some content' });
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });

    it('should return AuthenticationRequiredError', async () => {
      const testQuestionId = questionIds[0];
      const testAnswerId = answerIds[1];
      const updatedContent = '--------更新----------';
      const response = await request(app.getHttpServer())
        .put(`/questions/${testQuestionId}/answers/${testAnswerId}`)
        .send({ content: updatedContent });
      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
    it('should throw AnswerNotFoundError', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const testAnswerId = answerIds[0];
      const testQuestionId = AnswerQuestionMap[testAnswerId] + 1;
      const response = await request(app.getHttpServer())
        .put(`/questions/${testQuestionId}/answers/${testAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ content: 'Some content' });

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });
  });

  describe('Delete Answer', () => {
    it('should return PermissionDeniedError', async () => {
      const TestAnswerId = answerIds[0];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .delete(`/questions/${TestQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(response.body.message).toMatch(/PermissionDeniedError: /);
      expect(response.body.code).toBe(403);
    });
    it('should successfully delete an answer', async () => {
      const TestAnswerId = answerIds[2];
      const testQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .delete(`/questions/${testQuestionId}/answers/${TestAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.status).toBe(200);
    });

    it('should return a not found error when trying to delete a non-existent answer', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const testQuestionId = questionIds[0];
      const nonExistentAnswerId = 0;
      const response = await request(app.getHttpServer())
        .delete(`/questions/${testQuestionId}/answers/${nonExistentAnswerId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });

    it('should return AuthenticationRequiredError', async () => {
      const testQuestionId = questionIds[0];
      const TestAnswerId = answerIds[2];
      const response = await request(app.getHttpServer()).delete(
        `/questions/${testQuestionId}/answers/${TestAnswerId}`,
      );

      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
  });

  describe('Favorite Answer', () => {
    it('should successfully favorite an answer', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const TestAnswerId = answerIds[1];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .put(`/questions/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toBe('Answer favorited successfully.');
      expect(response.status).toBe(200);
    });

    it('should successfully unfavorite an answer', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const TestAnswerId = answerIds[1];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      await request(app.getHttpServer())
        .put(`/questions/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      const response = await request(app.getHttpServer())
        .delete(`/questions/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.status).toBe(200);
    });

    it('should throw AnswerNotFavoriteError when trying to unfavorite an answer that has not been favorited yet', async () => {
      const auxAccessToken = userIdTokenPairList[0][1];
      const TestAnswerId = answerIds[4];
      const TestQuestionId = AnswerQuestionMap[TestAnswerId];
      const response = await request(app.getHttpServer())
        .delete(`/questions/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(response.body.message).toMatch(/AnswerNotFavoriteError: /);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(400);
    });
    it('should throw AnswerNotFoundError when trying to favorite a non-existent answer', async () => {
      const TestQuestionId = questionIds[0];
      const nonExistentAnswerId = 99999;
      const response = await request(app.getHttpServer())
        .put(
          `/questions/${TestQuestionId}/answers/${nonExistentAnswerId}/favorite`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);

      expect(response.body.code).toBe(404);
    });
    it('should throw AnswerNotFoundError when trying to unfavorite a non-existent answer', async () => {
      const TestQuestionId = questionIds[0];
      const auxAccessToken = userIdTokenPairList[0][1];
      const nonExistentAnswerId = 99998;
      const response = await request(app.getHttpServer())
        .delete(
          `/questions/${TestQuestionId}/answers/${nonExistentAnswerId}/favorite`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();

      expect(response.body.message).toMatch(/AnswerNotFoundError: /);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
    });

    it('should return AuthenticationRequiredError', async () => {
      const TestAnswerId = answerIds[1];
      const TestQuestionId = questionIds[0];
      const response = await request(app.getHttpServer())
        .put(`/questions/${TestQuestionId}/answers/${TestAnswerId}/favorite`)
        .send();

      expect(response.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(response.body.code).toBe(401);
    });
  });

  describe('Set Attitude to Answer', () => {
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post(
          `/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}/attitudes`,
        )
        .send({ attitude_type: 'POSITIVE' });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
      expect(respond.statusCode).toBe(401);
    });
    it('should set attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(
          `/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}/attitudes`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ attitude_type: 'POSITIVE' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the answer',
      );
      expect(respond.body.code).toBe(201);
      expect(respond.statusCode).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(0);
      expect(respond.body.data.attitudes.difference).toBe(1);
      expect(respond.body.data.attitudes.user_attitude).toBe('POSITIVE');
    });
    it('should set attitude successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(
          `/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}/attitudes`,
        )
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitude_type: 'NEGATIVE' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the answer',
      );
      expect(respond.body.code).toBe(201);
      expect(respond.statusCode).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(1);
      expect(respond.body.data.attitudes.negative_count).toBe(1);
      expect(respond.body.data.attitudes.difference).toBe(0);
      expect(respond.body.data.attitudes.user_attitude).toBe('NEGATIVE');
    });
    // it('should get answer dto with attitude statics', async () => {
    //   const respond = await request(app.getHttpServer())
    //     .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
    //     .send();
    //   expect(respond.body.message).toBe('Answer fetched successfully.');
    //   expect(respond.body.code).toBe(200);
    //   expect(respond.statusCode).toBe(200);
    //   expect(respond.body.data.answer.attitudes.positive_count).toBe(1);
    //   expect(respond.body.data.answer.attitudes.negative_count).toBe(1);
    //   expect(respond.body.data.answer.attitudes.difference).toBe(0);
    //   expect(respond.body.data.answer.attitudes.user_attitude).toBe(
    //     'UNDEFINED',
    //   );
    // });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
      expect(respond.statusCode).toBe(401);
    });
    it('should get answer dto with attitude statics', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Answer fetched successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.statusCode).toBe(200);
      expect(respond.body.data.answer.attitudes.positive_count).toBe(1);
      expect(respond.body.data.answer.attitudes.negative_count).toBe(1);
      expect(respond.body.data.answer.attitudes.difference).toBe(0);
      expect(respond.body.data.answer.attitudes.user_attitude).toBe('POSITIVE');
    });
    it('should get answer dto with attitude statics', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Answer fetched successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.statusCode).toBe(200);
      expect(respond.body.data.answer.attitudes.positive_count).toBe(1);
      expect(respond.body.data.answer.attitudes.negative_count).toBe(1);
      expect(respond.body.data.answer.attitudes.difference).toBe(0);
      expect(respond.body.data.answer.attitudes.user_attitude).toBe('NEGATIVE');
    });
    it('should set attitude to positive successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(
          `/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}/attitudes`,
        )
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send({ attitude_type: 'UNDEFINED' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the answer',
      );
      expect(respond.body.code).toBe(201);
      expect(respond.statusCode).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(0);
      expect(respond.body.data.attitudes.negative_count).toBe(1);
      expect(respond.body.data.attitudes.difference).toBe(-1);
      expect(respond.body.data.attitudes.user_attitude).toBe('UNDEFINED');
    });
    it('should set attitude to positive successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post(
          `/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}/attitudes`,
        )
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitude_type: 'UNDEFINED' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the answer',
      );
      expect(respond.body.code).toBe(201);
      expect(respond.statusCode).toBe(201);
      expect(respond.body.data.attitudes.positive_count).toBe(0);
      expect(respond.body.data.attitudes.negative_count).toBe(0);
      expect(respond.body.data.attitudes.difference).toBe(0);
      expect(respond.body.data.attitudes.user_attitude).toBe('UNDEFINED');
    });
    it('should get answer dto with attitude statics', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Answer fetched successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.statusCode).toBe(200);
      expect(respond.body.data.answer.attitudes.positive_count).toBe(0);
      expect(respond.body.data.answer.attitudes.negative_count).toBe(0);
      expect(respond.body.data.answer.attitudes.difference).toBe(0);
      expect(respond.body.data.answer.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
    it('should get answer dto with attitude statics', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Answer fetched successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.statusCode).toBe(200);
      expect(respond.body.data.answer.attitudes.positive_count).toBe(0);
      expect(respond.body.data.answer.attitudes.negative_count).toBe(0);
      expect(respond.body.data.answer.attitudes.difference).toBe(0);
      expect(respond.body.data.answer.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
    it('should get answer dto with attitude statics', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/questions/${specialQuestionId}/answers/${specialAnswerIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Answer fetched successfully.');
      expect(respond.body.code).toBe(200);
      expect(respond.statusCode).toBe(200);
      expect(respond.body.data.answer.attitudes.positive_count).toBe(0);
      expect(respond.body.data.answer.attitudes.negative_count).toBe(0);
      expect(respond.body.data.answer.attitudes.difference).toBe(0);
      expect(respond.body.data.answer.attitudes.user_attitude).toBe(
        'UNDEFINED',
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

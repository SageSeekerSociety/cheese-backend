import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('comments Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestTopicCode = Math.floor(Math.random() * 10000000000).toString();
  const TestTopicPrefix = `[Test(${TestTopicCode}) Question]`;
  const TestQuestionCode = Math.floor(Math.random() * 10000000000).toString();
  const TestQuestionPrefix = `[Test(${TestQuestionCode}) Question]`;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;

  let TestToken: string;
  let TestUserDto: any;
  let TestUserId: number;
  let auxAccessToken: string;
  let auxUserDto: any;
  let auxUserId: number;

  // for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let auxAdminAccessToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let auxAdminUserDto: any;
  const CommentIds: number[] = [];
  const TopicIds: number[] = [];
  const questionIds: number[] = [];
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
    it('should create an auxiliary user', async () => {
      [auxUserId, auxAccessToken] = await createAuxiliaryUser();
    });
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
      await Promise.all([
        createQuestion('这学期几号放假啊？', '如题'),
        createQuestion(
          '好难受啊',
          '我这学期选了五十学分，每天都要早八，而且还有好多作业要写，好难受啊。安慰安慰我吧。',
        ),
        createQuestion('Question title with emoji: 😂😂', 'content'),
        createQuestion('title', 'Question content with emoji: 😂😂'),
        createQuestion('long question', '啊'.repeat(30000)),
      ]);
    }, 60000);
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [TopicIds[0], TopicIds[1]],
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should return TopicNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          title: `${TestQuestionPrefix} 我这个哥德巴赫猜想的证明对吗？`,
          content:
            '哥德巴赫猜想又名1+1=2，而显然1+1=2是成立的，所以哥德巴赫猜想是成立的。',
          type: 0,
          topics: [-1],
        });
      expect(respond.body.message).toMatch(/^TopicNotFoundError: /);
      expect(respond.body.code).toBe(404);
    });
    it('should create some comments', async () => {
      async function createComment(
        commentableId: number,
        commentableType: 'comment' | 'question' | 'answer',
        content: string,
      ) {
        const respond = await request(app.getHttpServer())
          .post(`/comments/${commentableType}/${commentableId}/create`)
          .set('Authorization', `Bearer ${TestToken}`)
          .send({
            content: `${TestCommentPrefix} ${content}`,
          });

        expect(respond.body.message).toBe('Comment created successfully');
        expect(respond.body.code).toBe(201);
        expect(respond.status).toBe(201);
        expect(respond.body.data.id).toBeTruthy();
        CommentIds.push(respond.body.data.id);
      }
      await createComment(questionIds[0], 'question', 'zfgg好帅');
      await createComment(questionIds[1], 'question', 'zfggnb');
      await createComment(questionIds[2], 'question', 'zfgg???????');
      await createComment(questionIds[3], 'question', '宵宫!');
      await createComment(CommentIds[0], 'comment', '啦啦啦德玛西亚');
    }, 80000);
    it('should not create comment due to invalid commentableId', async () => {
      const content = 'what you gonna to know?';
      const respond = await request(app.getHttpServer())
        .post(`/comments/question/114514/create`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({
          content: `${TestCommentPrefix} ${content}`,
        });

      expect(respond.body.message).toContain('CommentableID');
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });
    it('should return AuthenticationRequiredError', async () => {
      const content = 'what you gonna to know?';
      const respond = await request(app.getHttpServer())
        .post(`/comments/question/${questionIds[0]}/create`)
        .send({
          content: `${TestCommentPrefix} ${content}`,
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should create some auxiliary users', async () => {
      [auxUserDto, auxAccessToken] = await createAuxiliaryUser();
      [auxAdminUserDto, auxAdminAccessToken] = await createAuxiliaryUser();
    });
    console.log(auxAccessToken);
    console.log(auxAdminAccessToken);
    console.log(auxUserDto);
    console.log(auxAdminUserDto);
    console.log(TestUserDto);
    console.log(TestUserId);
    console.log(auxUserId);
  });

  // describe('get Comments', () => {
  //   it('should get all comments', async () => {
  //     console.log(questionIds[0]);
  //     const respond = await request(app.getHttpServer())
  //       .get(`/comments/question/${questionIds[0]}`)
  //       .set('Authorization', `Bearer ${TestToken}`)
  //       .send();

  //     expect(respond.body.message).toBe('Get comments successfully');
  //     expect(respond.status).toBe(200);
  //     expect(respond.body.code).toBe(200);
  //     console.log(respond.body.comment)
  //     expect(respond.body.data.comments[0].commentableId).toBe(questionIds[0]);
  //     expect(respond.body.data.comments[0].commentableType).toBe('question');
  //     expect(respond.body.data.comments[0].content).toBe('zfgg好帅!');
  //     expect(respond.body.data.comments[0].id).toBeDefined();
  //     expect(respond.body.data.comments[0].created_at).toBeDefined();
  //     expect(respond.body.data.comments[0].agree_count).toBe(0);
  //     expect(respond.body.data.comments[0].disagree_count).toBe(0);
  //     expect(respond.body.data.comments[0].agree_type).toBe('3');
  //     expect(respond.body.data.comments[0].user).toStrictEqual(TestUserDto);
  //     // expect(respond.body.data.page.page_start).toBe(CommentIds[3]);
  //     // expect(respond.body.data.page.page_size).toBe(2);
  //     // expect(respond.body.data.page.has_prev).toBe(false);
  //     // expect(respond.body.data.page.prev_start).toBeFalsy();
  //     // expect(respond.body.data.page.has_more).toBe(true);
  //     // expect(respond.body.data.page.next_start).toBe(CommentIds[1]);
  //   });
  // });

  describe('get comment list by id', () => {
    it('should get comment by id', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(questionIds[0]);
      expect(respond.body.data.commentableType).toBe('question');
      expect(respond.body.data.content).toContain('zfgg好帅');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(0);
      expect(respond.body.data.agreeCount).toBe(0);
      expect(respond.body.data.agreeType).toBe('Indifferent');
    });
    it('should get comment by id', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[4]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(CommentIds[0]);
      expect(respond.body.data.commentableType).toBe('comment');
      expect(respond.body.data.content).toContain('啦啦啦德玛西亚');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(0);
      expect(respond.body.data.agreeCount).toBe(0);
      expect(respond.body.data.agreeType).toBe('Indifferent');
    });
    it('should return CommentNotFoundError due to the invalid id', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/114514`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toContain('CommentNotFoundError');
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('AttitudeToComment', () => {
    it('should agree to a comment', async () => {
      const commentId = CommentIds[0];
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitudeType: 'Agreed' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the comment',
      );
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      // 可以根据具体情况验证其他返回数据
    });
    it('should agree to a comment', async () => {
      const commentId = CommentIds[4];
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitudeType: 'Agreed' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the comment',
      );
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      // 可以根据具体情况验证其他返回数据
    });
    it('should get some difference from others', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(questionIds[0]);
      expect(respond.body.data.commentableType).toBe('question');
      expect(respond.body.data.content).toContain('zfgg好帅');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(0);
      expect(respond.body.data.agreeCount).toBe(1);
      expect(respond.body.data.agreeType).toBe('Indifferent');
    });
    it('should get some difference from self', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(questionIds[0]);
      expect(respond.body.data.commentableType).toBe('question');
      expect(respond.body.data.content).toContain('zfgg好帅');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(0);
      expect(respond.body.data.agreeCount).toBe(1);
      expect(respond.body.data.agreeType).toBe('Agreed');
    });
    it('should disagree to a comment', async () => {
      const commentId = CommentIds[0];
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitudeType: 'Disagreed' });
      expect(respond.body.message).toBe(
        'You have expressed your attitude towards the comment',
      );
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
    });
    it('should get some difference from others', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(questionIds[0]);
      expect(respond.body.data.commentableType).toBe('question');
      expect(respond.body.data.content).toContain('zfgg好帅');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(1);
      expect(respond.body.data.agreeCount).toBe(0);
      expect(respond.body.data.agreeType).toBe('Indifferent');
    });
    it('should get some difference from self', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/comments/${CommentIds[0]}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Details are as follows');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.id).toBeDefined();
      expect(respond.body.data.commentableId).toBe(questionIds[0]);
      expect(respond.body.data.commentableType).toBe('question');
      expect(respond.body.data.content).toContain('zfgg好帅');
      expect(respond.body.data.createdAt).toBeDefined();
      expect(respond.body.data.disagreeCount).toBe(1);
      expect(respond.body.data.agreeCount).toBe(0);
      expect(respond.body.data.agreeType).toBe('Disagreed');
    });
    it('should return to InvalidAgreeTypeError', async () => {
      const commentId = CommentIds[1];
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitudeType: '5' });
      expect(respond.body.message).toContain('InvalidAgreeTypeError:');
      expect(respond.status).toBe(400);
      expect(respond.body.code).toBe(400);
    });
    it('should return CommentNotFoundError', async () => {
      const commentId = 114514;
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send({ attitudeType: '2' });
      expect(respond.body.message).toContain('CommentNotFoundError:');
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return AuthenticationRequiredError', async () => {
      const commentId = CommentIds[1];
      const respond = await request(app.getHttpServer())
        .post(`/comments/${commentId}/attitude`)
        .send({ attitudeType: '2' });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const commentId = CommentIds[1];
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Comment deleted already');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(204);
    });
    it('should not delete a comment when the user does not match', async () => {
      const commentId = CommentIds[0];
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toContain('CommentNotFoundByUserError:');
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should not delete a comment due to the invalid commentId', async () => {
      const commentId = 114514;
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${auxAccessToken}`)
        .send();
      expect(respond.body.message).toContain('CommentNotFoundError:');
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });
    it('should return AuthenticationRequiredError', async () => {
      const commentId = CommentIds[0];
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.body.code).toBe(401);
    });
    it('should delete a comment', async () => {
      const commentId = CommentIds[4];
      const respond = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${TestToken}`)
        .send();
      expect(respond.body.message).toBe('Comment deleted already');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(204);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});
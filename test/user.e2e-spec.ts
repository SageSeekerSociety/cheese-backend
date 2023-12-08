import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock("../src/users/email.service")

describe('User Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(Math.random() * 10000000000)}@ruc.edu.cn`;
  var TestUserId: number;
  var TestToken: string;

  beforeEach(async () => {
    MockedEmailService.mockClear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 20000);

  describe('register logic', () => {
    it('should return InvalidEmailAddressError', () => {
      return request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "test"
        })
        .expect({
          code: 422,
          message: "InvalidEmailAddressError: Invalid email address: test. Email should look like someone@example.com"
        })
        .expect(422);
    });
    it('should return InvalidEmailSuffixError', () => {
      return request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "test@126.com"
        })
        .expect({
          code: 422,
          message: "InvalidEmailSuffixError: Invalid email suffix: test@126.com. Only @ruc.edu.cn is supported currently."
        })
        .expect(422);
    });
    it('should return EmailSendFailedError', async () => {
      MockedEmailService.prototype.sendRegisterCode.mockImplementation(() => {
        throw new Error('Email service error');
      });
      const respond = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: TestEmail
        });
      expect(respond.body).toStrictEqual({
        code: 500,
        message: `EmailSendFailedError: Failed to send email to ${TestEmail}`
      });
      expect(respond.status).toBe(500);
      MockedEmailService.prototype.sendRegisterCode.mockImplementation(() => {
        return;
      });
    });
    it(`should send an email and register a user ${TestUsername}`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: TestEmail
        })
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond1.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith(TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          nickname: "test_user",
          password: "abc123456!!!",
          email: TestEmail,
          emailCode: verificationCode
        })
      const respond = await req;
      expect(respond.body.message).toStrictEqual("Register successfully.");
      expect(respond.body.code).toEqual(201);
      req.expect(201);
    });
    it('should return EmailAlreadyRegisteredError', () => {
      return request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: TestEmail
        })
        .expect({
          code: 409,
          message: `EmailAlreadyRegisteredError: Email already registered: ${TestEmail}`
        })
        .expect(409);
    });
    it(`should return UsernameAlreadyRegisteredError`, async () => {
      const respond = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "another-" + TestEmail
        })
      expect(respond.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("another-" + TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      return request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          nickname: "test_user",
          password: "abc123456!!!",
          email: "another-" + TestEmail,
          emailCode: verificationCode
        })
        .expect({
          code: 409,
          message: `UsernameAlreadyRegisteredError: Username already registered: ${TestUsername}`
        })
        .expect(409);
    });
    it(`should return InvalidUsernameError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "another-" + TestEmail
        })
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond1.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("another-" + TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername + " Invalid",
          nickname: "test_user",
          password: "abc123456!!!",
          email: "another-" + TestEmail,
          emailCode: verificationCode
        })
      const respond = await req;
      expect(respond.body.message).toStrictEqual(`InvalidUsernameError: Invalid username: ${TestUsername + " Invalid"}. Username must be 4-32 characters long and can only contain letters, numbers, underscores and hyphens.`);
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return InvalidNicknameError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "another-" + TestEmail
        })
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond1.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("another-" + TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          nickname: "test user",
          password: "abc123456!!!",
          email: "another-" + TestEmail,
          emailCode: verificationCode
        })
      const respond = await req;
      expect(respond.body.message).toStrictEqual(`InvalidNicknameError: Invalid nickname: test user. Nickname must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.`);
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return InvalidPasswordError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "another-" + TestEmail
        })
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond1.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("another-" + TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          nickname: "test_user",
          password: "123456",
          email: "another-" + TestEmail,
          emailCode: verificationCode
        })
      const respond = await req;
      expect(respond.body.message).toStrictEqual(`InvalidPasswordError: Invalid password. Password must be 8 characters long and must contain at least one letter, one special character and one number.`);
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return CodeNotMatchError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "another-" + TestEmail
        })
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: "Send email successfully."
      });
      expect(respond1.status).toBe(201);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveReturnedTimes(1);
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("another-" + TestEmail, expect.any(String));
      const verificationCode =
        (MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post("/users")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          nickname: "test_user",
          password: "abc123456!!!",
          email: "another-" + TestEmail,
          emailCode: verificationCode + "1"
        })
      const respond = await req;
      expect(respond.body.message).toStrictEqual(`CodeNotMatchError: Code not match: ${"another-" + TestEmail}, ${verificationCode + "1"}`);
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
  });

  describe('login logic', () => {
    it('should login successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post("/users/auth/login")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          password: "abc123456!!!"
        });
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.message).toBe("Login successfully.");
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe("test_user");
      TestUserId = respond.body.data.user.id;
      TestToken = respond.body.data.token;
    });
    it('should return UsernameNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post("/users/auth/login")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername + "KKK",
          password: "abc123456!!!"
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect((respond.body.message as string).startsWith("UsernameNotFoundError:")).toBe(true);
    });
    it('should return PasswordNotMatchError', async () => {
      const respond = await request(app.getHttpServer())
        .post("/users/auth/login")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          username: TestUsername,
          password: "abc123456"
        });
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
      expect((respond.body.message as string).startsWith("PasswordNotMatchError:")).toBe(true);
    });
  });

  describe('update user profile', () => {
    it('should update user profile', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .set("authorization", "Bearer " + TestToken)
        .send({
          nickname: "test_user_updated",
          avatar: "https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4",
          intro: "test user updated"
        })
      expect(respond.body.message).toBe("Update user successfully.");
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    })
    it('should return InvalidTokenError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .set("authorization", "Bearer " + TestToken + "1")
        .send({
          nickname: "test_user_updated",
          avatar: "https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4",
          intro: "test user updated"
        })
      expect((respond.body.message as string).startsWith("InvalidTokenError:")).toBe(true);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    })
  })


  afterEach(async () => {
    await app.close();
  })
});

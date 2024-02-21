/*
 *  Description: This file tests the core function of user module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service';
jest.mock('../src/users/email.service');

describe('User Module', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestEmail = `test-${Math.floor(
    Math.random() * 10000000000,
  )}@ruc.edu.cn`;
  let TestRefreshTokenOld: string;
  let TestRefreshToken: string;
  let TestToken: string;

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

  describe('register logic', () => {
    it('should return InvalidEmailAddressError', () => {
      return (
        request(app.getHttpServer())
          .post('/users/verify/email')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            email: 'test',
          })
          .expect({
            code: 422,
            message:
              'InvalidEmailAddressError: Invalid email address: test. Email should look like someone@example.com',
          })
          .expect(422)
      );
    });
    it('should return InvalidEmailSuffixError', () => {
      return (
        request(app.getHttpServer())
          .post('/users/verify/email')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            email: 'test@126.com',
          })
          .expect({
            code: 422,
            message:
              'InvalidEmailSuffixError: Invalid email suffix: test@126.com. Only @ruc.edu.cn is supported currently.',
          })
          .expect(422)
      );
    });
    it('should return EmailSendFailedError', async () => {
      MockedEmailService.prototype.sendRegisterCode.mockImplementation(() => {
        throw new Error('Email service error');
      });
      const respond = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond.body).toStrictEqual({
        code: 500,
        message: `EmailSendFailedError: Failed to send email to ${TestEmail}`,
      });
      expect(respond.status).toBe(500);
      MockedEmailService.prototype.sendRegisterCode.mockImplementation(() => {
        return;
      });
    });
    it(`should return CodeNotMatchError`, async () => {
      jest.useFakeTimers({ advanceTimers: true });

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

      jest.advanceTimersByTime(11 * 60 * 1000);

      const respond2 = await request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: 'abc123456!!!',
          email: TestEmail,
          emailCode: verificationCode,
        });
      expect(respond2.body.message).toMatch(/^CodeNotMatchError: /);
      expect(respond2.body.code).toEqual(422);
      expect(respond2.status).toBe(422);

      jest.useRealTimers();
    });
    it(`should send an email and register a user ${TestUsername}`, async () => {
      jest.useFakeTimers({ advanceTimers: true });

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

      jest.advanceTimersByTime(9 * 60 * 1000);

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
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');

      jest.useRealTimers();
    });
    it('should return EmailAlreadyRegisteredError', () => {
      return (
        request(app.getHttpServer())
          .post('/users/verify/email')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            email: TestEmail,
          })
          .expect({
            code: 409,
            message: `EmailAlreadyRegisteredError: Email already registered: ${TestEmail}`,
          })
          .expect(409)
      );
    });
    it(`should return UsernameAlreadyRegisteredError`, async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'another-' + TestEmail,
        });
      expect(respond.body).toStrictEqual({
        code: 201,
        message: 'Send email successfully.',
      });
      expect(respond.status).toBe(201);
      expect(
        MockedEmailService.mock.instances[0].sendRegisterCode,
      ).toHaveReturnedTimes(1);
      expect(
        MockedEmailService.mock.instances[0].sendRegisterCode,
      ).toHaveBeenCalledWith('another-' + TestEmail, expect.any(String));
      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];
      return (
        request(app.getHttpServer())
          .post('/users')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            username: TestUsername,
            nickname: 'test_user',
            password: 'abc123456!!!',
            email: 'another-' + TestEmail,
            emailCode: verificationCode,
          })
          .expect({
            code: 409,
            message: `UsernameAlreadyRegisteredError: Username already registered: ${TestUsername}`,
          })
          .expect(409)
      );
    });
    it(`should return InvalidEmailAddressError`, async () => {
      const respond = await request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: 'abc123456!!!',
          email: 'abc123',
          emailCode: '000000',
        });
      expect(respond.body.message).toMatch(/^InvalidEmailAddressError: /);
      expect(respond.body.code).toEqual(422);
      expect(respond.status).toBe(422);
    });
    it(`should return InvalidEmailSuffixError`, async () => {
      const respond = await request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: 'abc123456!!!',
          email: 'abc123@123.com',
          emailCode: '000000',
        });
      expect(respond.body.message).toMatch(/^InvalidEmailSuffixError: /);
      expect(respond.body.code).toEqual(422);
      expect(respond.status).toBe(422);
    });
    it(`should return InvalidUsernameError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'another-' + TestEmail,
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
      ).toHaveBeenCalledWith('another-' + TestEmail, expect.any(String));
      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername + ' Invalid',
          nickname: 'test_user',
          password: 'abc123456!!!',
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual(
        `InvalidUsernameError: Invalid username: ${
          TestUsername + ' Invalid'
        }. Username must be 4-32 characters long and can only contain letters, numbers, underscores and hyphens.`,
      );
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return InvalidNicknameError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'another-' + TestEmail,
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
      ).toHaveBeenCalledWith('another-' + TestEmail, expect.any(String));
      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test user',
          password: 'abc123456!!!',
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual(
        `InvalidNicknameError: Invalid nickname: test user. Nickname must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.`,
      );
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return InvalidPasswordError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'another-' + TestEmail,
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
      ).toHaveBeenCalledWith('another-' + TestEmail, expect.any(String));
      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];
      const req = request(app.getHttpServer())
        .post('/users')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: '123456',
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual(
        `InvalidPasswordError: Invalid password. Password must be at least 8 characters long and must contain at least one letter, one special character and one number.`,
      );
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
    it(`should return CodeNotMatchError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'another-' + TestEmail,
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
      ).toHaveBeenCalledWith('another-' + TestEmail, expect.any(String));
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
          email: 'another-' + TestEmail,
          emailCode: verificationCode + '1',
        });
      const respond = await req;
      expect(respond.body.message).toStrictEqual(
        `CodeNotMatchError: Code not match: ${'another-' + TestEmail}, ${
          verificationCode + '1'
        }`,
      );
      expect(respond.body.code).toEqual(422);
      req.expect(422);
    });
  });

  describe('login logic', () => {
    it('should login successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'abc123456!!!',
        });
      expect(respond.body.message).toBe('Login successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      expect(respond.header['set-cookie'][0]).toMatch(
        /^REFRESH_TOKEN=.+; Path=\/users\/auth; Expires=.+; HttpOnly; SameSite=Strict$/,
      );
      TestRefreshToken = respond.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      expect(respond.body.data.accessToken).toBeDefined();
      TestToken = respond.body.data.accessToken;
    });
    it('should refresh access token successfully', async () => {
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toBe('Refresh token successfully.');
      expect(respond2.status).toBe(201);
      expect(respond2.body.code).toBe(201);
      expect(respond2.body.data.accessToken).toBeDefined();
      TestRefreshTokenOld = TestRefreshToken;
      TestRefreshToken = respond2.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      TestToken = respond2.body.data.accessToken;
      expect(respond2.body.data.user.username).toBe(TestUsername);
      expect(respond2.body.data.user.nickname).toBe('test_user');
    });
    it('should return RefreshTokenAlreadyUsedError', async () => {
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshTokenOld};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toMatch(/^RefreshTokenAlreadyUsedError: /);
      expect(respond2.status).toBe(401);
      expect(respond2.body.code).toBe(401);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set('Cookie', `some_cookie=12345;    other_cookie=value`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should refresh successfully after 29 days but return TokenExpiredError after 31 days', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      jest.setSystemTime(Date.now() + 29 * 24 * 60 * 60 * 1000);
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toBe('Refresh token successfully.');
      expect(respond2.status).toBe(201);
      expect(respond2.body.code).toBe(201);
      expect(respond2.body.data.accessToken).toBeDefined();
      expect(respond2.body.data.user.username).toBe(TestUsername);
      expect(respond2.body.data.user.nickname).toBe('test_user');
      const refreshToken = respond2.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      jest.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
      const respond3 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${refreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond3.body.message).toMatch(/^TokenExpiredError: /);
      expect(respond3.status).toBe(401);
      expect(respond3.body.code).toBe(401);
      jest.useRealTimers();
    });
    it('should login successfully again', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'abc123456!!!',
        });
      expect(respond.body.message).toBe('Login successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      expect(respond.header['set-cookie'][0]).toMatch(
        /^REFRESH_TOKEN=.+; Path=\/users\/auth; Expires=.+; HttpOnly; SameSite=Strict$/,
      );
      TestRefreshToken = respond.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      expect(respond.body.data.accessToken).toBeDefined();
      TestToken = respond.body.data.accessToken;
    });
    it('should return SessionExpiredError', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      let refreshToken: string = TestRefreshToken;
      for (let i = 0; i < 12; i++) {
        jest.advanceTimersByTime(1000 * 60 * 60 * 24 * 29);
        const respond2 = await request(app.getHttpServer())
          .post('/users/auth/refresh-token')
          .set(
            'Cookie',
            `some_cookie=12345;    REFRESH_TOKEN=${refreshToken};    other_cookie=value`,
          )
          .send();
        expect(respond2.body.message).toBe('Refresh token successfully.');
        expect(respond2.status).toBe(201);
        expect(respond2.body.code).toBe(201);
        expect(respond2.body.data.accessToken).toBeDefined();
        refreshToken = respond2.header['set-cookie'][0]
          .split(';')[0]
          .split('=')[1];
        expect(respond2.body.data.user.username).toBe(TestUsername);
        expect(respond2.body.data.user.nickname).toBe('test_user');
      }
      jest.advanceTimersByTime(1000 * 60 * 60 * 24 * 29);
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${refreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toMatch(/^SessionExpiredError: /);
      expect(respond2.status).toBe(401);
      expect(respond2.body.code).toBe(401);
      jest.useRealTimers();
    }, 30000);
    it('should login successfully again', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'abc123456!!!',
        });
      expect(respond.body.message).toBe('Login successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
      expect(respond.header['set-cookie'][0]).toMatch(
        /^REFRESH_TOKEN=.+; Path=\/users\/auth; Expires=.+; HttpOnly; SameSite=Strict$/,
      );
      TestRefreshToken = respond.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      expect(respond.body.data.accessToken).toBeDefined();
      TestToken = respond.body.data.accessToken;
    });
    it('should refresh access token successfully again', async () => {
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond2.body.message).toBe('Refresh token successfully.');
      expect(respond2.status).toBe(201);
      expect(respond2.body.code).toBe(201);
      expect(respond2.body.data.accessToken).toBeDefined();
      TestRefreshTokenOld = TestRefreshToken;
      TestRefreshToken = respond2.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];
      TestToken = respond2.body.data.accessToken;
      expect(respond2.body.data.user.username).toBe(TestUsername);
      expect(respond2.body.data.user.nickname).toBe('test_user');
    });
    it('should return UsernameNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername + 'KKK',
          password: 'abc123456!!!',
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^UsernameNotFoundError: /);
    });
    it('should return PasswordNotMatchError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'abc123456',
        });
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
      expect(respond.body.message).toMatch(/^PasswordNotMatchError: /);
    });
    it('should logout successfully', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/logout')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond.body.message).toBe('Logout successfully.');
      expect(respond.status).toBe(201);
      expect(respond.body.code).toBe(201);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/logout')
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/logout')
        .set('Cookie', `some_cookie=12345;    other_cookie=value`)
        .send();
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should return SessionRevokedError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set(
          'Cookie',
          `some_cookie=12345;    REFRESH_TOKEN=${TestRefreshToken};    other_cookie=value`,
        )
        .send();
      expect(respond.body.message).toMatch(/^SessionRevokedError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('password reset logic', () => {
    it('should return InvalidEmailAddressError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'test',
        });
      expect(respond.body.message).toMatch(/^InvalidEmailAddressError: /);
      expect(respond.body.code).toBe(422);
      expect(respond.status).toBe(422);
    });

    it('should return InvalidEmailSuffixError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'test@test.com',
        });
      expect(respond.body.message).toMatch(/^InvalidEmailSuffixError: /);
      expect(respond.body.code).toBe(422);
      expect(respond.status).toBe(422);
    });

    it('should return EmailSendFailedError', async () => {
      MockedEmailService.prototype.sendPasswordResetEmail.mockImplementation(
        () => {
          throw new Error('Email service error');
        },
      );
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond.body.message).toMatch(/^EmailSendFailedError: /);
      expect(respond.body.code).toBe(500);
      expect(respond.status).toBe(500);
      MockedEmailService.prototype.sendPasswordResetEmail.mockImplementation(
        () => {
          return;
        },
      );
    });

    it('should return EmailNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: 'KKK-' + TestEmail,
        });
      expect(respond.body.message).toMatch(/^EmailNotFoundError: /);
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });

    it('should send a password reset email and reset the password', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond.body.message).toBe('Send email successfully.');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveReturnedTimes(1);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveBeenCalledWith(TestEmail, expect.any(String));
      const token = (
        MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
      ).mock.calls[0][1];

      jest.advanceTimersByTime(9 * 60 * 1000);

      const respond2 = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          new_password: 'ABC^^^666',
          token: token,
        });
      expect(respond2.body.message).toBe('Reset password successfully.');
      expect(respond2.body.code).toBe(201);
      expect(respond2.status).toBe(201);

      // Try re-login
      const respond3 = await request(app.getHttpServer())
        .post('/users/auth/login')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          username: TestUsername,
          password: 'ABC^^^666',
        });
      expect(respond3.body.message).toBe('Login successfully.');
      expect(respond3.status).toBe(201);
      expect(respond3.body.code).toBe(201);

      jest.useRealTimers();
    });

    it('should return PermissionDeniedError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          new_password: 'ABC^^^666',
          token: TestToken,
        });
      expect(respond.body.message).toMatch(/^PermissionDeniedError: /);
      expect(respond.body.code).toBe(403);
      expect(respond.status).toBe(403);
    });

    it('should return TokenExpiredError', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond.body.message).toBe('Send email successfully.');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveReturnedTimes(1);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveBeenCalledWith(TestEmail, expect.any(String));
      const token = (
        MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
      ).mock.calls[0][1];

      jest.advanceTimersByTime(11 * 60 * 1000);

      const respond2 = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          new_password: 'ABC^^^666',
          token: token,
        });
      expect(respond2.body.message).toMatch(/^TokenExpiredError: /);
      expect(respond2.body.code).toBe(401);
      expect(respond2.status).toBe(401);

      jest.useRealTimers();
    });

    it('should return InvalidPasswordError', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          email: TestEmail,
        });
      expect(respond.body.message).toBe('Send email successfully.');
      expect(respond.body.code).toBe(201);
      expect(respond.status).toBe(201);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveReturnedTimes(1);
      expect(
        MockedEmailService.mock.instances[0].sendPasswordResetEmail,
      ).toHaveBeenCalledWith(TestEmail, expect.any(String));
      const token = (
        MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
      ).mock.calls[0][1];

      jest.advanceTimersByTime(9 * 60 * 1000);

      const respond2 = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          new_password: '123456',
          token: token,
        });
      expect(respond2.body.message).toMatch(/^InvalidPasswordError: /);
      expect(respond2.body.code).toBe(422);
      expect(respond2.status).toBe(422);

      jest.useRealTimers();
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

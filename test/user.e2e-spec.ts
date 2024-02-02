/*
 *  Description: This file tests the user module.
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
  let TestUserId: number;
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
      expect(respond.body.data.user.username).toBe(TestUsername);
      expect(respond.body.data.user.nickname).toBe('test_user');
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
        `InvalidPasswordError: Invalid password. Password must be 8 characters long and must contain at least one letter, one special character and one number.`,
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
      TestUserId = respond.body.data.user.id;
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

  describe('update user profile', () => {
    it('should update user profile', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken)
        .send({
          nickname: 'test_user_updated',
          avatar:
            'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
          intro: 'test user updated',
        });
      expect(respond.body.message).toBe('Update user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
    });
    it('should return InvalidTokenError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken + '1')
        .send({
          nickname: 'test_user_updated',
          avatar:
            'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
          intro: 'test user updated',
        });
      expect(respond.body.message).toMatch(/^InvalidTokenError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer())
        .put(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .send({
          nickname: 'test_user_updated',
          avatar:
            'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
          intro: 'test user updated',
        });
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });
  });

  describe('get user profile', () => {
    it('should get modified user profile', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.username).toBe(TestUsername);
      expect(respond.body.data.nickname).toBe('test_user_updated');
      expect(respond.body.data.avatar).toBe(
        'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
      );
      expect(respond.body.data.intro).toBe('test user updated');
    });
    it('should get modified user profile even without a token', async () => {
      const respond = await request(app.getHttpServer()).get(
        `/users/${TestUserId}`,
      );
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      //.set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.username).toBe(TestUsername);
      expect(respond.body.data.nickname).toBe('test_user_updated');
      expect(respond.body.data.avatar).toBe(
        'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
      );
      expect(respond.body.data.intro).toBe('test user updated');
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
    });
  });

  describe('follow logic', () => {
    const tempUserIds: number[] = [];
    it('should successfully create some auxiliary users first', async () => {
      const server = app.getHttpServer();
      async function createAuxiliaryUser(
        username: string,
        nickname: string,
        password: string,
        email: string,
      ): Promise<number> {
        const respond = await request(server)
          .post('/users/verify/email')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            email: email,
          });
        expect(respond.status).toBe(201);
        const verificationCode = (
          MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
        ).mock.calls.at(-1)[1];
        const respond2 = await request(server)
          .post('/users')
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .send({
            username: username,
            nickname: nickname,
            password: password,
            email: email,
            emailCode: verificationCode,
          });
        expect(respond2.status).toBe(201);
        return respond2.body.data.user.id;
      }
      for (let i = 0; i < 10; i++) {
        tempUserIds.push(
          await createAuxiliaryUser(
            `TestUser-${Math.floor(Math.random() * 10000000000)}`,
            'nick',
            'ABC123456!!!',
            `test-${Math.floor(Math.random() * 10000000000)}@ruc.edu.cn`,
          ),
        );
      }
    });

    it('should return AuthenticationRequiredError', async () => {
      const respond = await request(app.getHttpServer()).post(
        `/users/${tempUserIds[0]}/followers`,
      );
      //.set('User-Agent', 'PostmanRuntime/7.26.8')
      expect(respond.body.message).toMatch(/^AuthenticationRequiredError: /);
      expect(respond.status).toBe(401);
      expect(respond.body.code).toBe(401);
    });

    it('should return UserIdNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${tempUserIds[0] + 1000000000}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^UserIdNotFoundError: /);
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
    });

    it('should return FollowYourselfError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${TestUserId}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^FollowYourselfError: /);
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
    });

    it('should follow user successfully', async () => {
      for (const id of tempUserIds) {
        const respond = await request(app.getHttpServer())
          .post(`/users/${id}/followers`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond.body.message).toBe('Follow user successfully.');
        expect(respond.status).toBe(201);
        expect(respond.body.code).toBe(201);
      }
    });

    it('should return UserAlreadyFollowedError', async () => {
      const respond = await request(app.getHttpServer())
        .post(`/users/${tempUserIds[0]}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toMatch(/^UserAlreadyFollowedError: /);
      expect(respond.status).toBe(422);
      expect(respond.body.code).toBe(422);
    });

    it('should unfollow user successfully', async () => {
      const respond = await request(app.getHttpServer())
        .delete(`/users/${tempUserIds.at(-1)}/followers`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Unfollow user successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      tempUserIds.pop();
    });

    it('should get follower list successfully', async () => {
      for (const id of tempUserIds) {
        const respond = await request(app.getHttpServer())
          .get(`/users/${id}/followers`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond.body.message).toBe('Query followers successfully.');
        expect(respond.status).toBe(200);
        expect(respond.body.code).toBe(200);
        expect(respond.body.data.users.length).toBe(1);
        expect(respond.body.data.users[0].id).toBe(TestUserId);
        expect(respond.body.data.users[0].avatar).toBe(
          'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
        );
        expect(respond.body.data.page.page_start).toBe(TestUserId);
        expect(respond.body.data.page.page_size).toBe(1);
        expect(respond.body.data.page.has_prev).toBe(false);
        expect(respond.body.data.page.prev_start).toBe(0);
        expect(respond.body.data.page.has_more).toBe(false);
        expect(respond.body.data.page.next_start).toBe(0);

        const respond2 = await request(app.getHttpServer())
          .get(`/users/${id}/followers?page_start=${TestUserId}&page_size=1`)
          //.set('User-Agent', 'PostmanRuntime/7.26.8')
          .set('authorization', 'Bearer ' + TestToken);
        expect(respond2.body.message).toBe('Query followers successfully.');
        expect(respond2.status).toBe(200);
        expect(respond2.body.code).toBe(200);
        expect(respond2.body.data.users.length).toBe(1);
        expect(respond2.body.data.users[0].id).toBe(TestUserId);
        expect(respond2.body.data.users[0].avatar).toBe(
          'https://avatars.githubusercontent.com/u/10000000?s=460&u=1f6b6f0b9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5&v=4',
        );
        expect(respond2.body.data.page.page_start).toBe(TestUserId);
        expect(respond2.body.data.page.page_size).toBe(1);
        expect(respond2.body.data.page.has_prev).toBe(false);
        expect(respond2.body.data.page.prev_start).toBe(0);
        expect(respond2.body.data.page.has_more).toBe(false);
        expect(respond2.body.data.page.next_start).toBe(0);
      }
    });

    it('should get following list and split the page successfully', async () => {
      const respond = await request(app.getHttpServer())
        .get(`/users/${TestUserId}/follow/users`)
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond.body.message).toBe('Query followees successfully.');
      expect(respond.status).toBe(200);
      expect(respond.body.code).toBe(200);
      expect(respond.body.data.users.length).toBe(9);
      expect(respond.body.data.users[0].id).toBe(tempUserIds[0]);
      expect(respond.body.data.page.page_start).toBe(tempUserIds[0]);
      expect(respond.body.data.page.page_size).toBe(9);
      expect(respond.body.data.page.has_prev).toBe(false);
      expect(respond.body.data.page.prev_start).toBe(0);
      expect(respond.body.data.page.has_more).toBe(false);
      expect(respond.body.data.page.next_start).toBe(0);

      const respond2 = await request(app.getHttpServer())
        .get(
          `/users/${TestUserId}/follow/users?page_start=${tempUserIds[0]}&page_size=1`,
        )
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond2.body.message).toBe('Query followees successfully.');
      expect(respond2.status).toBe(200);
      expect(respond2.body.code).toBe(200);
      expect(respond2.body.data.users.length).toBe(1);
      expect(respond2.body.data.users[0].id).toBe(tempUserIds[0]);
      expect(respond2.body.data.page.page_start).toBe(tempUserIds[0]);
      expect(respond2.body.data.page.page_size).toBe(1);
      expect(respond2.body.data.page.has_prev).toBe(false);
      expect(respond2.body.data.page.prev_start).toBe(0);
      expect(respond2.body.data.page.has_more).toBe(true);
      expect(respond2.body.data.page.next_start).toBe(tempUserIds[1]);

      const respond3 = await request(app.getHttpServer())
        .get(
          `/users/${TestUserId}/follow/users?page_start=${tempUserIds[2]}&page_size=2`,
        )
        //.set('User-Agent', 'PostmanRuntime/7.26.8')
        .set('authorization', 'Bearer ' + TestToken);
      expect(respond3.body.message).toBe('Query followees successfully.');
      expect(respond3.status).toBe(200);
      expect(respond3.body.code).toBe(200);
      expect(respond3.body.data.users.length).toBe(2);
      expect(respond3.body.data.users[0].id).toBe(tempUserIds[2]);
      expect(respond3.body.data.page.page_start).toBe(tempUserIds[2]);
      expect(respond3.body.data.page.page_size).toBe(2);
      expect(respond3.body.data.page.has_prev).toBe(true);
      expect(respond3.body.data.page.prev_start).toBe(tempUserIds[0]);
      expect(respond3.body.data.page.has_more).toBe(true);
      expect(respond3.body.data.page.next_start).toBe(tempUserIds[4]);
    }, 20000);
  });

  afterAll(async () => {
    await app.close();
  });
});

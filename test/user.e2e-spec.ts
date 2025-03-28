/*
 *  Description: This file tests the core function of user module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import session from 'express-session';
import { authenticator } from 'otplib';
import * as srpClient from 'secure-remote-password/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

jest.mock('../src/email/email.service');

// // Mock SRP client
// jest.mock('secure-remote-password/client', () => ({
//   generateSalt: jest.fn(() => 'test-salt'),
//   derivePrivateKey: jest.fn((salt, username, password) => 'test-private-key'),
//   deriveVerifier: jest.fn((privateKey) => 'test-verifier'),
//   generateEphemeral: jest.fn(() => ({ public: 'client-public', secret: 'client-secret' })),
//   deriveSession: jest.fn((clientSecretEphemeral, serverPublicEphemeral, salt, username, privateKey) => ({
//     key: 'session-key',
//     proof: 'client-proof'
//   })),
//   verifySession: jest.fn((serverProof, clientSession) => true)
// }));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(() =>
    Promise.resolve({ challenge: 'fake-challenge' }),
  ),
  verifyRegistrationResponse: jest.fn(() =>
    Promise.resolve({
      verified: true,
      registrationInfo: {
        credential: { id: 'cred-id', publicKey: 'fake-public-key', counter: 1 },
        credentialBackedUp: false,
        credentialDeviceType: 'singleDevice',
      },
    }),
  ),
  generateAuthenticationOptions: jest.fn(() =>
    Promise.resolve({ challenge: 'fake-auth-challenge', allowCredentials: [] }),
  ),
  verifyAuthenticationResponse: jest.fn(() =>
    Promise.resolve({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    }),
  ),
}));

const MockedEmailService = <jest.Mock<EmailService>>EmailService;

type HttpServer = ReturnType<INestApplication['getHttpServer']>;

/**
 * 使用 SRP 进行登录
 */
async function loginWithSRP(
  httpServer: HttpServer,
  username: string,
  password: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: number;
}> {
  const clientEphemeral = srpClient.generateEphemeral();
  const agent = request.agent(httpServer);

  // 1. 初始化 SRP 登录
  const initResponse = await agent
    .post('/users/auth/srp/init')
    .send({
      username,
    })
    .expect(201);

  // 2. 完成 SRP 验证
  const privateKey = srpClient.derivePrivateKey(
    initResponse.body.data.salt,
    username,
    password,
  );
  const clientSession = srpClient.deriveSession(
    clientEphemeral.secret,
    initResponse.body.data.serverPublicEphemeral,
    initResponse.body.data.salt,
    username,
    privateKey,
  );

  const verifyResponse = await agent
    .post('/users/auth/srp/verify')
    .send({
      username,
      clientPublicEphemeral: clientEphemeral.public,
      clientProof: clientSession.proof,
    })
    .expect(201);

  const refreshToken = verifyResponse.header['set-cookie'][0]
    .split(';')[0]
    .split('=')[1];

  return {
    accessToken: verifyResponse.body.data.accessToken,
    refreshToken,
    userId: verifyResponse.body.data.user.id,
  };
}

/**
 * 使用 SRP 进行 sudo 验证
 */
async function verifySudoWithSRP(
  httpServer: HttpServer,
  token: string,
  username: string,
  password: string,
): Promise<string> {
  const clientEphemeral = srpClient.generateEphemeral();
  const agent = request.agent(httpServer);

  const sudoInitRes = await agent
    .post('/users/auth/sudo')
    .set('Authorization', `Bearer ${token}`)
    .send({
      method: 'srp',
      credentials: {},
    })
    .expect(201);

  const privateKey = srpClient.derivePrivateKey(
    sudoInitRes.body.data.salt,
    username,
    password,
  );
  const clientSession = srpClient.deriveSession(
    clientEphemeral.secret,
    sudoInitRes.body.data.serverPublicEphemeral,
    sudoInitRes.body.data.salt,
    username,
    privateKey,
  );

  const sudoVerifyRes = await agent
    .post('/users/auth/sudo')
    .set('Authorization', `Bearer ${token}`)
    .send({
      method: 'srp',
      credentials: {
        clientPublicEphemeral: clientEphemeral.public,
        clientProof: clientSession.proof,
      },
    })
    .expect(201);

  return sudoVerifyRes.body.data.accessToken;
}

/**
 * 创建一个使用传统认证的用户
 */
async function createLegacyUser(httpServer: HttpServer): Promise<{
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  userId: number;
}> {
  const username = `TestLegacyUser-${Math.floor(Math.random() * 10000000000)}`;
  const password = 'Legacy@123456';
  const email = `legacy-${Math.floor(Math.random() * 10000000000)}@ruc.edu.cn`;

  // 发送验证邮件
  const emailRes = await request(httpServer)
    .post('/users/verify/email')
    .send({ email })
    .expect(201);

  const verificationCode = (
    MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
  ).mock.calls[0][1];

  // 注册用户
  const registerRes = await request(httpServer)
    .post('/users')
    .send({
      username,
      nickname: 'legacy_user',
      password,
      email,
      emailCode: verificationCode,
      isLegacyAuth: true,
    })
    .expect(201);

  const refreshToken = registerRes.header['set-cookie'][0]
    .split(';')[0]
    .split('=')[1];

  return {
    username,
    password,
    accessToken: registerRes.body.data.accessToken,
    refreshToken,
    userId: registerRes.body.data.user.id,
  };
}

describe('User Module', () => {
  let app: INestApplication;
  const TestUsername = `TestUser-${Math.floor(Math.random() * 10000000000)}`;
  const TestPassword = 'abc123456!!!';
  const TestNewPassword = 'ABC^^^666';
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
    app.use(
      session({
        secret: 'testSecret',
        resave: false,
        saveUninitialized: false,
      }),
    );
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
      return request(app.getHttpServer())
        .post('/users/verify/email')
        .send({
          email: 'test',
        })
        .expect({
          code: 422,
          message:
            'InvalidEmailAddressError: Invalid email address: test. Email should look like someone@example.com',
        })
        .expect(422);
    });

    it('should return InvalidEmailSuffixError', () => {
      return request(app.getHttpServer())
        .post('/users/verify/email')
        .send({
          email: 'test@126.com',
        })
        .expect({
          code: 422,
          message:
            'InvalidEmailSuffixError: Invalid email suffix: test@126.com. Only @ruc.edu.cn is supported currently.',
        })
        .expect(422);
    });

    it('should return EmailSendFailedError', async () => {
      MockedEmailService.prototype.sendRegisterCode.mockImplementation(() => {
        throw new Error('Email service error');
      });
      const respond = await request(app.getHttpServer())
        .post('/users/verify/email')
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

    it(`should send an email and register a user ${TestUsername} with SRP`, async () => {
      jest.useFakeTimers({ advanceTimers: true });

      // 1. 发送验证邮件
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        .send({
          email: TestEmail,
        });
      expect(respond1.body).toStrictEqual({
        code: 201,
        message: 'Send email successfully.',
      });
      expect(respond1.status).toBe(201);

      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];

      jest.advanceTimersByTime(9 * 60 * 1000);

      // 2. 使用 SRP 注册
      const salt = srpClient.generateSalt();
      const privateKey = srpClient.derivePrivateKey(
        salt,
        TestUsername,
        TestPassword,
      );
      const verifier = srpClient.deriveVerifier(privateKey);

      const registerResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          srpSalt: salt,
          srpVerifier: verifier,
          email: TestEmail,
          emailCode: verificationCode,
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.message).toBe('Register successfully.');
      expect(registerResponse.body.data.user.username).toBe(TestUsername);
      expect(registerResponse.body.data.user.nickname).toBe('test_user');
      expect(registerResponse.body.data.accessToken).toBeDefined();

      // 保存 token 用于后续测试
      TestToken = registerResponse.body.data.accessToken;
      TestRefreshToken = registerResponse.header['set-cookie'][0]
        .split(';')[0]
        .split('=')[1];

      jest.useRealTimers();
    });

    it('should return EmailAlreadyRegisteredError', () => {
      return request(app.getHttpServer())
        .post('/users/verify/email')
        .send({
          email: TestEmail,
        })
        .expect({
          code: 409,
          message: `EmailAlreadyRegisteredError: Email already registered: ${TestEmail}`,
        })
        .expect(409);
    });
    it(`should return UsernameAlreadyRegisteredError`, async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/verify/email')
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
      return request(app.getHttpServer())
        .post('/users')
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: TestPassword,
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
          isLegacyAuth: true,
        })
        .expect({
          code: 409,
          message: `UsernameAlreadyRegisteredError: Username already registered: ${TestUsername}`,
        })
        .expect(409);
    });
    it(`should return InvalidEmailAddressError`, async () => {
      const respond = await request(app.getHttpServer()).post('/users').send({
        username: TestUsername,
        nickname: 'test_user',
        password: TestPassword,
        email: 'abc123',
        emailCode: '000000',
        isLegacyAuth: true,
      });
      expect(respond.body.message).toMatch(/^InvalidEmailAddressError: /);
      expect(respond.body.code).toEqual(422);
      expect(respond.status).toBe(422);
    });
    it(`should return InvalidEmailSuffixError`, async () => {
      const respond = await request(app.getHttpServer()).post('/users').send({
        username: TestUsername,
        nickname: 'test_user',
        password: TestPassword,
        email: 'abc123@123.com',
        emailCode: '000000',
        isLegacyAuth: true,
      });
      expect(respond.body.message).toMatch(/^InvalidEmailSuffixError: /);
      expect(respond.body.code).toEqual(422);
      expect(respond.status).toBe(422);
    });
    it(`should return InvalidUsernameError`, async () => {
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
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
        .send({
          username: TestUsername + ' Invalid',
          nickname: 'test_user',
          password: TestPassword,
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
          isLegacyAuth: true,
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
        .send({
          username: TestUsername,
          nickname: 'test user',
          password: TestPassword,
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
          isLegacyAuth: true,
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
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: '123456',
          email: 'another-' + TestEmail,
          emailCode: verificationCode,
          isLegacyAuth: true,
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
        .send({
          username: TestUsername,
          nickname: 'test_user',
          password: TestPassword,
          email: 'another-' + TestEmail,
          emailCode: verificationCode + '1',
          isLegacyAuth: true,
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
    it('should login successfully with SRP', async () => {
      const auth = await loginWithSRP(
        app.getHttpServer(),
        TestUsername,
        TestPassword,
      );
      TestToken = auth.accessToken;
      TestRefreshToken = auth.refreshToken;
    });

    it('should return SrpVerificationError', async () => {
      const clientEphemeral = srpClient.generateEphemeral();

      const agent = request.agent(app.getHttpServer());
      await agent.post('/users/auth/srp/init').send({
        username: TestUsername,
      });

      const verifyResponse = await agent.post('/users/auth/srp/verify').send({
        username: TestUsername,
        clientPublicEphemeral: clientEphemeral.public,
        clientProof: 'wrong-proof',
      });

      expect(verifyResponse.status).toBe(401);
      expect(verifyResponse.body.message).toMatch(/^SrpVerificationError: /);
    });

    it('should return UsernameNotFoundError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/auth/srp/init')
        .send({
          username: TestUsername + 'KKK',
        });
      expect(respond.status).toBe(404);
      expect(respond.body.code).toBe(404);
      expect(respond.body.message).toMatch(/^UsernameNotFoundError: /);
    });

    it('should refresh access token successfully', async () => {
      const respond2 = await request(app.getHttpServer())
        .post('/users/auth/refresh-token')
        .set('Cookie', `REFRESH_TOKEN=${TestRefreshToken}`)
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

    it('should verify sudo mode with SRP', async () => {
      TestToken = await verifySudoWithSRP(
        app.getHttpServer(),
        TestToken,
        TestUsername,
        TestPassword,
      );
    });
  });

  describe('password reset logic', () => {
    it('should return InvalidEmailAddressError', async () => {
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
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
        .send({
          email: 'KKK-' + TestEmail,
        });
      expect(respond.body.message).toMatch(/^EmailNotFoundError: /);
      expect(respond.body.code).toBe(404);
      expect(respond.status).toBe(404);
    });

    it('should send a password reset email and reset the password', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      // 1. 发送重置密码邮件
      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
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
      ).toHaveBeenCalledWith(TestEmail, TestUsername, expect.any(String));
      const token = (
        MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
      ).mock.calls[0][2];

      jest.advanceTimersByTime(9 * 60 * 1000);

      // 2. 使用 token 重置密码，使用 SRP 凭证
      const salt = srpClient.generateSalt();
      const privateKey = srpClient.derivePrivateKey(
        salt,
        TestUsername,
        TestNewPassword,
      );
      const verifier = srpClient.deriveVerifier(privateKey);

      const respond2 = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        .send({
          token: token,
          srpSalt: salt,
          srpVerifier: verifier,
        });
      expect(respond2.body.message).toBe('Reset password successfully.');
      expect(respond2.body.code).toBe(201);
      expect(respond2.status).toBe(201);

      // 3. 使用新密码通过 SRP 登录
      const clientEphemeral = srpClient.generateEphemeral();
      const agent = request.agent(app.getHttpServer());

      const initResponse = await agent.post('/users/auth/srp/init').send({
        username: TestUsername,
      });

      expect(initResponse.status).toBe(201);
      expect(initResponse.body.data.salt).toBe(salt); // 应该与重置时使用的 salt 相同

      const clientSession = srpClient.deriveSession(
        clientEphemeral.secret,
        initResponse.body.data.serverPublicEphemeral,
        salt,
        TestUsername,
        privateKey,
      );

      const verifyResponse = await agent.post('/users/auth/srp/verify').send({
        username: TestUsername,
        clientPublicEphemeral: clientEphemeral.public,
        clientProof: clientSession.proof,
      });

      expect(verifyResponse.status).toBe(201);
      expect(verifyResponse.body.data.accessToken).toBeDefined();
      expect(verifyResponse.body.data.user.username).toBe(TestUsername);

      jest.useRealTimers();
    });

    it('should return PermissionDeniedError', async () => {
      const salt = srpClient.generateSalt();
      const privateKey = srpClient.derivePrivateKey(
        salt,
        TestUsername,
        TestNewPassword,
      );
      const verifier = srpClient.deriveVerifier(privateKey);

      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        .send({
          token: TestToken,
          srpSalt: salt,
          srpVerifier: verifier,
        });
      expect(respond.body.message).toMatch(/^PermissionDeniedError: /);
      expect(respond.body.code).toBe(403);
      expect(respond.status).toBe(403);
    });

    it('should return TokenExpiredError', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      const respond = await request(app.getHttpServer())
        .post('/users/recover/password/request')
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
      ).toHaveBeenCalledWith(TestEmail, TestUsername, expect.any(String));
      const token = (
        MockedEmailService.mock.instances[0].sendPasswordResetEmail as jest.Mock
      ).mock.calls[0][2];

      jest.advanceTimersByTime(11 * 60 * 1000);

      const salt = srpClient.generateSalt();
      const privateKey = srpClient.derivePrivateKey(
        salt,
        TestUsername,
        TestNewPassword,
      );
      const verifier = srpClient.deriveVerifier(privateKey);

      const respond2 = await request(app.getHttpServer())
        .post('/users/recover/password/verify')
        .send({
          token: token,
          srpSalt: salt,
          srpVerifier: verifier,
        });
      expect(respond2.body.message).toMatch(/^TokenExpiredError: /);
      expect(respond2.body.code).toBe(401);
      expect(respond2.status).toBe(401);

      jest.useRealTimers();
    });
  });

  describe('Sudo Mode Authentication', () => {
    let testUserId: number;
    let validToken: string;

    beforeAll(async () => {
      const auth = await loginWithSRP(
        app.getHttpServer(),
        TestUsername,
        TestNewPassword,
      );
      validToken = auth.accessToken;
      testUserId = auth.userId;
    });

    it('should verify sudo mode with password and trigger SRP upgrade', async () => {
      // 创建传统认证用户
      const legacyUser = await createLegacyUser(app.getHttpServer());

      // 使用密码验证 sudo，这应该会触发 SRP 升级
      const sudoRes = await request(app.getHttpServer())
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${legacyUser.accessToken}`)
        .send({
          method: 'password',
          credentials: {
            password: legacyUser.password,
          },
        });

      expect(sudoRes.status).toBe(201);
      expect(sudoRes.body.data.accessToken).toBeDefined();
      expect(sudoRes.body.data.srpUpgraded).toBe(true);
      expect(sudoRes.body.message).toBe(
        'Password verification successful and account upgraded to SRP',
      );

      // 验证用户现在可以使用 SRP 登录
      const clientEphemeral = srpClient.generateEphemeral();

      const agent = request.agent(app.getHttpServer());

      // 初始化 SRP 登录
      const initRes = await agent.post('/users/auth/srp/init').send({
        username: legacyUser.username,
      });

      expect(initRes.status).toBe(201);
      expect(initRes.body.data.salt).toBeDefined();
      expect(initRes.body.data.serverPublicEphemeral).toBeDefined();

      // 完成 SRP 验证
      const privateKey = srpClient.derivePrivateKey(
        initRes.body.data.salt,
        legacyUser.username,
        legacyUser.password,
      );
      const clientSession = srpClient.deriveSession(
        clientEphemeral.secret,
        initRes.body.data.serverPublicEphemeral,
        initRes.body.data.salt,
        legacyUser.username,
        privateKey,
      );

      const verifyRes = await agent.post('/users/auth/srp/verify').send({
        username: legacyUser.username,
        clientPublicEphemeral: clientEphemeral.public,
        clientProof: clientSession.proof,
      });

      expect(verifyRes.status).toBe(201);
      expect(verifyRes.body.data.accessToken).toBeDefined();
      expect(verifyRes.body.data.user.username).toBe(legacyUser.username);
    });

    it('should verify sudo mode with TOTP', async () => {
      // 进入 sudo 模式
      validToken = await verifySudoWithSRP(
        app.getHttpServer(),
        validToken,
        TestUsername,
        TestNewPassword,
      );

      // 首先启用 TOTP - 获取 secret
      const enable2FARes = await request(app.getHttpServer())
        .post(`/users/${testUserId}/2fa/enable`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({})
        .expect(201);

      const secret = enable2FARes.body.data.secret;

      // 使用 otplib 生成真实的 TOTP 验证码
      const totpCode = authenticator.generate(secret);

      // 完成 TOTP 设置
      const setupRes = await request(app.getHttpServer())
        .post(`/users/${testUserId}/2fa/enable`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          secret,
          code: totpCode,
        })
        .expect(201);

      expect(setupRes.body.data.backup_codes).toBeDefined();
      expect(Array.isArray(setupRes.body.data.backup_codes)).toBe(true);
      expect(setupRes.body.data.backup_codes.length).toBeGreaterThan(0);

      // 生成新的 TOTP 码用于 sudo 验证
      const sudoTotpCode = authenticator.generate(secret);

      // 使用 TOTP 验证 sudo
      const sudoRes = await request(app.getHttpServer())
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          method: 'totp',
          credentials: {
            code: sudoTotpCode,
          },
        })
        .expect(201);

      expect(sudoRes.body.data.accessToken).toBeDefined();
      expect(sudoRes.body.message).toBe('Sudo mode activated successfully');

      // 测试完成后，禁用 2FA
      const disableRes = await request(app.getHttpServer())
        .post(`/users/${testUserId}/2fa/disable`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({})
        .expect(200);

      // 验证 2FA 已被禁用
      const statusRes = await request(app.getHttpServer())
        .get(`/users/${testUserId}/2fa/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(statusRes.body.data.enabled).toBe(false);
    });

    it('should reject sudo verification with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          method: 'password',
          credentials: {
            password: 'wrong-password',
          },
        })
        .expect(401);

      expect(res.body.message).toMatch(/InvalidCredentialsError/);
    });

    it('should reject sudo verification with wrong TOTP code', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          method: 'totp',
          credentials: {
            code: '000000',
          },
        })
        .expect(401);

      expect(res.body.message).toMatch(/InvalidCredentialsError/);
    });

    it('should reject sudo verification with invalid SRP proof', async () => {
      const clientEphemeral = srpClient.generateEphemeral();

      const agent = request.agent(app.getHttpServer());

      await agent
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          method: 'srp',
          credentials: {},
        });

      const res = await agent
        .post('/users/auth/sudo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          method: 'srp',
          credentials: {
            clientPublicEphemeral: clientEphemeral.public,
            clientProof: 'invalid-proof',
          },
        })
        .expect(401);

      expect(res.body.message).toMatch(/SrpVerificationError/);
    });
  });

  describe('Passkey Authentication Endpoints', () => {
    let testUserId: number;
    let validToken: string;
    const passkeyTestUsername = `PasskeyUser-${Math.floor(Math.random() * 10000000000)}`;
    const passkeyTestPassword = 'Passkey@123';
    const passkeyTestEmail = `passkey-${Math.floor(Math.random() * 10000000000)}@ruc.edu.cn`;

    beforeAll(async () => {
      jest.useFakeTimers({ advanceTimers: true });

      // 1. 发送验证邮件
      const respond1 = await request(app.getHttpServer())
        .post('/users/verify/email')
        .send({
          email: passkeyTestEmail,
        });
      expect(respond1.status).toBe(201);

      const verificationCode = (
        MockedEmailService.mock.instances[0].sendRegisterCode as jest.Mock
      ).mock.calls[0][1];

      jest.advanceTimersByTime(9 * 60 * 1000);

      // 2. 使用 SRP 注册新用户
      const salt = srpClient.generateSalt();
      const privateKey = srpClient.derivePrivateKey(
        salt,
        passkeyTestUsername,
        passkeyTestPassword,
      );
      const verifier = srpClient.deriveVerifier(privateKey);

      const registerResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          username: passkeyTestUsername,
          nickname: 'passkey_test',
          srpSalt: salt,
          srpVerifier: verifier,
          email: passkeyTestEmail,
          emailCode: verificationCode,
        });

      expect(registerResponse.status).toBe(201);

      // 3. 使用 SRP 登录
      const auth = await loginWithSRP(
        app.getHttpServer(),
        passkeyTestUsername,
        passkeyTestPassword,
      );
      validToken = auth.accessToken;
      testUserId = auth.userId;

      // 4. 进入 sudo 模式
      validToken = await verifySudoWithSRP(
        app.getHttpServer(),
        validToken,
        passkeyTestUsername,
        passkeyTestPassword,
      );

      jest.useRealTimers();
    });

    it('POST /users/{userId}/passkeys/options should return registration options', async () => {
      const res = await request(app.getHttpServer())
        .post(`/users/${testUserId}/passkeys/options`)
        .set('Authorization', `Bearer ${validToken}`)
        .send()
        .expect(201);
      expect(res.body.data.options).toBeDefined();
    });

    it('POST /users/{userId}/passkeys should register a new passkey', async () => {
      // 先获取注册选项
      const resOptions = await request(app.getHttpServer())
        .post(`/users/${testUserId}/passkeys/options`)
        .set('Authorization', `Bearer ${validToken}`)
        .send()
        .expect(201);

      const fakeRegistrationResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };

      const res = await request(app.getHttpServer())
        .post(`/users/${testUserId}/passkeys`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ response: fakeRegistrationResponse })
        .expect(201);
      expect(res.body.message).toBe('Passkey registered successfully.');
    });

    it('POST /users/auth/passkey/options should return authentication options', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/auth/passkey/options')
        .send()
        .expect(201);
      expect(res.body.data.options).toBeDefined();
    });

    it('POST /users/auth/passkey/verify should verify passkey login and return tokens', async () => {
      // 先获取认证选项
      const resOptions = await request(app.getHttpServer())
        .post('/users/auth/passkey/options')
        .send()
        .expect(201);
      const cookies = resOptions.headers['set-cookie'];

      const fakeAuthResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };

      const res = await request(app.getHttpServer())
        .post('/users/auth/passkey/verify')
        .set('Cookie', cookies)
        .send({ response: fakeAuthResponse })
        .expect(201);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('GET /users/{userId}/passkeys should return user passkeys list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${testUserId}/passkeys`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data.passkeys)).toBe(true);
    });

    it('DELETE /users/{userId}/passkeys/{credentialId} should delete passkey', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/${testUserId}/passkeys/cred-id`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      expect(res.body.message).toBe('Delete passkey successfully.');
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

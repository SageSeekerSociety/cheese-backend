/*
 *  Description: This file provide additional tests to users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { Request } from 'express';
import { AppModule } from '../app.module';
import { InvalidCredentialsError } from '../auth/auth.error';
import { UsersService } from '../users/users.service';
import { UserIdNotFoundError } from './users.error';

// Mock @simplewebauthn/server module
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(() =>
    Promise.resolve({
      challenge: 'fake-challenge',
      rp: { name: 'Test RP', id: 'localhost' },
      user: { name: 'testuser', id: Buffer.from('1') },
      pubKeyCredParams: [],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: [],
    }),
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
    Promise.resolve({
      challenge: 'fake-auth-challenge',
      timeout: 60000,
      rpId: 'localhost',
      allowCredentials: [],
      userVerification: 'preferred',
    }),
  ),
  verifyAuthenticationResponse: jest.fn(() =>
    Promise.resolve({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    }),
  ),
}));

describe('Users Module', () => {
  let app: TestingModule;
  let usersService: UsersService;
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    usersService = app.get<UsersService>(UsersService);
  });
  afterAll(async () => {
    await app.close();
  });

  it('should wait until user with id 1 exists', async () => {
    /* eslint-disable no-constant-condition */
    while (true) {
      try {
        await usersService.getUserDtoById(1, 1, '127.0.0.1', 'some user agent');
      } catch (e) {
        // wait one second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      break;
    }
  });

  it('should return UserIdNotFoundError', async () => {
    await expect(usersService.addFollowRelationship(-1, 1)).rejects.toThrow(
      new UserIdNotFoundError(-1),
    );
    await expect(usersService.addFollowRelationship(1, -1)).rejects.toThrow(
      new UserIdNotFoundError(-1),
    );
  });

  it('should return UserIdNotFoundError', async () => {
    await expect(
      usersService.updateUserProfile(-1, 'nick', 'int', 1),
    ).rejects.toThrow(new UserIdNotFoundError(-1));
  });

  it('should return zero', async () => {
    // expect(await usersService.getFollowingCount(undefined)).toBe(0);
    // expect(await usersService.getFollowedCount(undefined)).toBe(0);
    // expect(await usersService.getAnswerCount(undefined)).toBe(0);
    // expect(await usersService.getQuestionCount(undefined)).toBe(0);
    expect(await usersService.isUserFollowUser(undefined, 1)).toBe(false);
    expect(await usersService.isUserFollowUser(1, undefined)).toBe(false);
  });

  describe('Sudo Mode Authentication', () => {
    it('should check sudo mode status correctly', async () => {
      const authorization = {
        userId: 1,
        permissions: [],
        sudoUntil: Date.now() + 1000, // 设置1秒后过期
      };
      expect(usersService['authService'].checkSudoMode(authorization)).toBe(
        true,
      );

      const expiredAuth = {
        userId: 1,
        permissions: [],
        sudoUntil: Date.now() - 1000, // 已过期
      };
      expect(usersService['authService'].checkSudoMode(expiredAuth)).toBe(
        false,
      );

      const noSudoAuth = {
        userId: 1,
        permissions: [],
      };
      expect(usersService['authService'].checkSudoMode(noSudoAuth)).toBe(false);
    });

    it('should verify sudo with password successfully', async () => {
      // Mock user查询
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          hashedPassword: await bcrypt.hash('correct-password', 10),
        } as any);

      // Mock token验证和签发
      jest
        .spyOn(usersService['authService'], 'verify')
        .mockReturnValue({ userId: 1 } as any);
      jest.spyOn(usersService['authService'], 'decode').mockReturnValue({
        authorization: { userId: 1 },
        validUntil: Date.now() + 3600000,
      } as any);
      jest
        .spyOn(usersService['authService'], 'issueSudoToken')
        .mockResolvedValueOnce('new-sudo-token');

      const result = await usersService.verifySudo(
        {} as Request,
        'old-token',
        'password',
        { password: 'correct-password' },
      );
      expect(result).toBe('new-sudo-token');
    });

    it('should verify sudo with passkey successfully', async () => {
      // Mock passkey验证
      jest
        .spyOn(usersService, 'verifyPasskeyAuthentication')
        .mockResolvedValueOnce(true);

      // Mock token相关操作
      jest
        .spyOn(usersService['authService'], 'verify')
        .mockReturnValue({ userId: 1 } as any);
      jest.spyOn(usersService['authService'], 'decode').mockReturnValue({
        authorization: { userId: 1 },
        validUntil: Date.now() + 3600000,
      } as any);
      jest
        .spyOn(usersService['authService'], 'issueSudoToken')
        .mockResolvedValueOnce('new-sudo-token');

      const result = await usersService.verifySudo(
        {} as Request,
        'old-token',
        'passkey',
        { passkeyResponse: {} as any },
      );
      expect(result).toBe('new-sudo-token');
    });

    it('should throw InvalidCredentialsError for wrong password', async () => {
      jest
        .spyOn(usersService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          id: 1,
          hashedPassword: await bcrypt.hash('correct-password', 10),
        } as any);

      await expect(
        usersService.verifySudo({} as Request, 'old-token', 'password', {
          password: 'wrong-password',
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('Passkey Authentication', () => {
    it('should generate passkey registration options and store challenge', async () => {
      // 调用 generatePasskeyRegistrationOptions 方法，使用已有的用户 1
      const options = await usersService.generatePasskeyRegistrationOptions(1);
      expect(options.challenge).toBe('fake-challenge');
      // 此处可进一步验证 userChallengeRepository 内已存储 challenge（如果可访问的话）
    });

    it('should verify passkey registration successfully', async () => {
      // 先为用户 1 设置 challenge
      await usersService['userChallengeRepository'].setChallenge(
        1,
        'fake-challenge',
        600,
      );
      const fakeRegistrationResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      await expect(
        usersService.verifyPasskeyRegistration(
          1,
          fakeRegistrationResponse as any,
        ),
      ).resolves.not.toThrow();
    });

    it('should throw ChallengeNotFoundError if challenge is missing', async () => {
      await expect(
        usersService.verifyPasskeyRegistration(1, {} as any),
      ).rejects.toThrow();
    });

    it('should generate passkey authentication options and set session challenge', async () => {
      // 创建一个伪造的请求对象，包含 session 属性
      const req: any = { session: {} };
      const authOptions =
        await usersService.generatePasskeyAuthenticationOptions(req);
      expect(authOptions.challenge).toBe('fake-auth-challenge');
      expect(req.session.passkeyChallenge).toBe('fake-auth-challenge');
    });

    it('should verify passkey authentication and update counter', async () => {
      const req: any = { session: { passkeyChallenge: 'fake-auth-challenge' } };
      // 模拟 prismaService.passkey.findFirst 返回存在的认证器记录
      const findFirstSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'findFirst')
        .mockResolvedValueOnce({
          id: 123,
          credentialId: 'cred-id',
          publicKey: Buffer.from('fake-public-key'),
          counter: 1,
          transports: JSON.stringify([]),
        } as any);
      // 监控 update 调用
      const updateSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'update')
        .mockResolvedValueOnce({} as any);
      const fakeAuthResponse = {
        id: 'cred-id',
        rawId: 'raw-cred-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      const result = await usersService.verifyPasskeyAuthentication(
        req,
        fakeAuthResponse as any,
      );
      expect(result).toBe(true);
      expect(findFirstSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith({
        where: {
          id: 123,
        },
        data: {
          counter: 2,
        },
      });
    });

    it('should throw PasskeyNotFoundError if authenticator is not found', async () => {
      const req: any = { session: { passkeyChallenge: 'fake-auth-challenge' } };
      jest
        .spyOn(usersService['prismaService'].passkey, 'findFirst')
        .mockResolvedValueOnce(null);
      const fakeAuthResponse = {
        id: 'non-existent',
        rawId: 'raw-id',
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
      };
      await expect(
        usersService.verifyPasskeyAuthentication(req, fakeAuthResponse as any),
      ).rejects.toThrow();
    });

    it('should get user passkeys', async () => {
      jest
        .spyOn(usersService['prismaService'].passkey, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 1,
            credentialId: 'test-id',
            publicKey: Buffer.from('key'),
            counter: 0,
            transports: JSON.stringify([]),
            deviceType: 'singleDevice',
            backedUp: false,
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      const passkeys = await usersService.getUserPasskeys(1);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0].credentialId).toBe('test-id');
    });

    it('should delete passkey for user', async () => {
      const deleteSpy = jest
        .spyOn(usersService['prismaService'].passkey, 'deleteMany')
        .mockResolvedValueOnce({ count: 1 } as any);
      await usersService.deletePasskey(1, 'test-id');
      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          userId: 1,
          credentialId: 'test-id',
        },
      });
    });
  });
});

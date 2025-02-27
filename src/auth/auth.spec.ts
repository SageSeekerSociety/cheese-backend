/*
 *  Description: This file provides additional tests to auth module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import {
  AuthenticationRequiredError,
  NotRefreshTokenError,
  PermissionDeniedError,
} from './auth.error';
import { AuthService } from './auth.service';
import { Authorization, AuthorizedAction } from './definitions';
import { SessionService } from './session.service';
import { CustomAuthLogicHandler } from './custom-auth-logic';

describe('AuthService', () => {
  let app: TestingModule;
  let authService: AuthService;
  let sessionService: SessionService;
  let jwtService: JwtService;
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    authService = app.get<AuthService>(AuthService);
    jwtService = app.get<JwtService>(JwtService);
    sessionService = app.get<SessionService>(SessionService);
  });
  afterAll(() => {
    app.close();
  });
  it('should throw Error("The token is valid, but...")', () => {
    const token = jwtService.sign({
      //authorization: { userId: 1, permissions: [] },
      signedAt: Date.now(),
      validUntil: Date.now() + 1000,
    });
    expect(() => authService.verify(token)).toThrow(
      'The token is valid, but the payload of the token is' +
        ' not a TokenPayload object. This is ether a bug or a malicious attack.',
    );
  });
  it('should throw Error("The token is valid, but...")', () => {
    const token = jwtService.sign({
      authorization: { userId: 1, permissions: [] },
      //signedAt: Date.now(),
      validUntil: Date.now() + 1000,
    });
    expect(() => authService.verify(token)).toThrow(
      'The token is valid, but the payload of the token is' +
        ' not a TokenPayload object. This is ether a bug or a malicious attack.',
    );
  });
  it('should throw Error("The token is valid, but...")', () => {
    const token = jwtService.sign({
      authorization: { userId: 1, permissions: [] },
      signedAt: Date.now(),
      //validUntil: Date.now() + 1000,
    });
    expect(() => authService.verify(token)).toThrow(
      'The token is valid, but the payload of the token is' +
        ' not a TokenPayload object. This is ether a bug or a malicious attack.',
    );
  });
  it('should throw Error("The token is valid, but...")', () => {
    const token = jwtService.sign({
      authorization: {
        userId: 1,
        permissions: [
          {
            authorizedActions: ['create'],
            authorizedResource: {
              resourceType: 'user',
              resourceId: 1,
            },
          },
        ],
      },
      signedAt: Date.now(),
      validUntil: Date.now() + 1000,
    });
    expect(() => authService.verify(token)).toThrow(
      'The token is valid, but the payload of the token is' +
        ' not a TokenPayload object. This is ether a bug or a malicious attack.',
    );
  });
  it('should throw Error("The token is valid, but...")', () => {
    const token = jwtService.sign({
      authorization: {
        userId: 1,
        permissions: [
          {
            authorizedActions: ['create'],
            authorizedResource: {
              resourceType: 'user',
              resourceId: 1,
              ownedByUser: '1',
            },
          },
        ],
      },
      signedAt: Date.now(),
      validUntil: Date.now() + 1000,
    });
    expect(() => authService.verify(token)).toThrow(
      'The token is valid, but the payload of the token is' +
        ' not a TokenPayload object. This is ether a bug or a malicious attack.',
    );
  });
  it('should throw Error("resourceOwnerId must be a number.")', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [],
    });
    expect(async () => {
      await authService.audit(token, 'other', '1' as any as number, 'type', 1);
    }).rejects.toThrow('resourceOwnerId must be a number.');
  });
  it('should throw Error("resourceId must be a number.")', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [],
    });
    expect(async () => {
      await authService.audit(token, 'other', 1, 'type', '1' as any as number);
    }).rejects.toThrow('resourceId must be a number.');
  });
  it('should throw AuthenticationRequiredError()', () => {
    expect(
      async () => await authService.audit('', 'other', 1, 'type', 1),
    ).rejects.toThrow(new AuthenticationRequiredError());
    expect(
      async () => await authService.audit(undefined, 'other', 1, 'type', 1),
    ).rejects.toThrow(new AuthenticationRequiredError());
    expect(() => authService.decode('')).toThrow(
      new AuthenticationRequiredError(),
    );
    expect(() => authService.decode(undefined)).toThrow(
      new AuthenticationRequiredError(),
    );
  });
  it('should pass audit', async () => {
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['query'],
          authorizedResource: {
            ownedByUser: 1,
            types: undefined,
            resourceIds: undefined,
          },
        },
      ],
    });
    await authService.audit(`bearer ${token}`, 'query', 1, 'type', 1);
  });
  it('should throw PermissionDeniedError()', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['delete'],
          authorizedResource: {
            ownedByUser: undefined,
            types: undefined,
            resourceIds: [1, 2, 3],
          },
        },
      ],
    });
    expect(
      async () => await authService.audit(token, 'delete', 1, 'type', 5),
    ).rejects.toThrow(new PermissionDeniedError('delete', 1, 'type', 5));
  });
  it('should verify and decode successfully', () => {
    const authorization: Authorization = {
      userId: 0,
      permissions: [],
    };
    const token = authService.sign(authorization);
    expect(authService.verify(token)).toEqual(authorization);
    expect(authService.verify(`Bearer ${token}`)).toEqual(authorization);
    expect(authService.verify(`bearer ${token}`)).toEqual(authorization);
    expect(authService.decode(token).authorization).toEqual(authorization);
    expect(authService.decode(`Bearer ${token}`).authorization).toEqual(
      authorization,
    );
    expect(authService.decode(`bearer ${token}`).authorization).toEqual(
      authorization,
    );
  });
  it('should throw NotRefreshTokenError()', async () => {
    const token = authService.sign({
      userId: 0,
      permissions: [],
    });
    await expect(sessionService.refreshSession(token)).rejects.toThrow(
      new NotRefreshTokenError(),
    );
    await expect(sessionService.revokeSession(token)).rejects.toThrow(
      new NotRefreshTokenError(),
    );
  });
  it('should throw Error()', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['some_action'],
          authorizedResource: {
            types: ['user'],
          },
          customLogic: 'some_logic',
        },
      ],
    });
    expect(async () => {
      await authService.audit(token, 'some_action', 1, 'user', 1);
    }).rejects.toThrow(new Error("Custom auth logic 'some_logic' not found."));
  });
  it('should register and invoke custom logic successfully', async () => {
    let handler_called = false;
    const handler: CustomAuthLogicHandler = async (
      userId: number,
      action: AuthorizedAction,
      resourceOwnerId?: number,
      resourceType?: string,
      resourceId?: number,
    ) => {
      handler_called = true;
      return true;
    };
    authService.customAuthLogics.register('some_logic', handler);
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['some_action'],
          authorizedResource: {
            types: ['user'],
          },
          customLogic: 'some_logic',
        },
      ],
    });
    await authService.audit(token, 'some_action', 1, 'user', 1);
    expect(handler_called).toBe(true);
  });
  it('should register and invoke custom logic successfully', async () => {
    let handler_called = false;
    const handler: CustomAuthLogicHandler = async (
      userId: number,
      action: AuthorizedAction,
      resourceOwnerId?: number,
      resourceType?: string,
      resourceId?: number,
    ) => {
      handler_called = true;
      return false;
    };
    authService.customAuthLogics.register('another_logic', handler);
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['another_action'],
          authorizedResource: {
            types: ['user'],
          },
          customLogic: 'another_logic',
        },
      ],
    });
    expect(async () => {
      await authService.audit(token, 'another_action', 1, 'user', 1);
    }).rejects.toThrow(
      new PermissionDeniedError('another_action', 1, 'user', 1),
    );
    expect(handler_called).toBe(true);
  });
  it('should invoke custom logic and get additional data successfully', async () => {
    let handler_called = false;
    let data = { some: '' };
    const handler: CustomAuthLogicHandler = async (
      userId: number,
      action: AuthorizedAction,
      resourceOwnerId?: number,
      resourceType?: string,
      resourceId?: number,
      customLogicData?: any,
    ) => {
      handler_called = true;
      data = customLogicData;
      return false;
    };
    authService.customAuthLogics.register('yet_another_logic', handler);
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: ['another_action'],
          authorizedResource: {
            types: ['user'],
          },
          customLogic: 'yet_another_logic',
          customLogicData: { some: 'data' },
        },
      ],
    });
    expect(async () => {
      await authService.audit(token, 'another_action', 1, 'user', 1);
    }).rejects.toThrow(
      new PermissionDeniedError('another_action', 1, 'user', 1),
    );
    expect(handler_called).toBe(true);
    expect(data).toEqual({ some: 'data' });
  });
  it('should always invoke custom logic successfully', async () => {
    let handler_called = false;
    const handler: CustomAuthLogicHandler = async (
      userId: number,
      action: AuthorizedAction,
      resourceOwnerId?: number,
      resourceType?: string,
      resourceId?: number,
    ) => {
      handler_called = true;
      return true;
    };
    authService.customAuthLogics.register('yet_yet_another_logic', handler);
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: undefined, // all actions
          authorizedResource: {}, // all resources
          customLogic: 'yet_yet_another_logic',
        },
      ],
    });
    await authService.audit(token, 'some_action', 1, 'user', 1);
    expect(handler_called).toBe(true);
    handler_called = false;
    await authService.audit(token, 'another_action', undefined, 'user', 1);
    expect(handler_called).toBe(true);
    handler_called = false;
    await authService.audit(
      token,
      'some_action',
      1,
      'another_resource',
      undefined,
    );
    expect(handler_called).toBe(true);
    handler_called = false;
    await authService.audit(
      token,
      'another_action',
      undefined,
      'another_resource',
      undefined,
    );
    expect(handler_called).toBe(true);
  });
});

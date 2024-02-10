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
import {
  AuthService,
  Authorization,
  AuthorizedAction,
  authorizedActionToString,
} from './auth.service';
import { SessionService } from './session.service';

describe('authorizedActionToString()', () => {
  it('should return "create" when AuthorizedAction.create is passed', () => {
    expect(authorizedActionToString(AuthorizedAction.create)).toEqual('create');
  });
  it('should return "delete" when AuthorizedAction.delete is passed', () => {
    expect(authorizedActionToString(AuthorizedAction.delete)).toEqual('delete');
  });
  it('should return "modify" when AuthorizedAction.modify is passed', () => {
    expect(authorizedActionToString(AuthorizedAction.modify)).toEqual('modify');
  });
  it('should return "query" when AuthorizedAction.query is passed', () => {
    expect(authorizedActionToString(AuthorizedAction.query)).toEqual('query');
  });
  it('should return "other" when AuthorizedAction.other is passed', () => {
    expect(authorizedActionToString(AuthorizedAction.other)).toEqual('other');
  });
});

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
            authorizedActions: [AuthorizedAction.create],
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
            authorizedActions: [AuthorizedAction.create],
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
    expect(() => {
      authService.audit(
        token,
        AuthorizedAction.other,
        '1' as any as number,
        'type',
        1,
      );
    }).toThrow('resourceOwnerId must be a number.');
  });
  it('should throw Error("resourceId must be a number.")', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [],
    });
    expect(() => {
      authService.audit(
        token,
        AuthorizedAction.other,
        1,
        'type',
        '1' as any as number,
      );
    }).toThrow('resourceId must be a number.');
  });
  it('should throw AuthenticationRequiredError()', () => {
    expect(() =>
      authService.audit('', AuthorizedAction.other, 1, 'type', 1),
    ).toThrow(new AuthenticationRequiredError());
    expect(() =>
      authService.audit(undefined, AuthorizedAction.other, 1, 'type', 1),
    ).toThrow(new AuthenticationRequiredError());
    expect(() => authService.decode('')).toThrow(
      new AuthenticationRequiredError(),
    );
    expect(() => authService.decode(undefined)).toThrow(
      new AuthenticationRequiredError(),
    );
  });
  it('should pass audit', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: [AuthorizedAction.query],
          authorizedResource: {
            ownedByUser: 1,
            types: undefined,
            resourceIds: undefined,
          },
        },
      ],
    });
    authService.audit(`bearer ${token}`, AuthorizedAction.query, 1, 'type', 1);
  });
  it('should throw PermissionDeniedError()', () => {
    const token = authService.sign({
      userId: 0,
      permissions: [
        {
          authorizedActions: [AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: undefined,
            types: undefined,
            resourceIds: [1, 2, 3],
          },
        },
      ],
    });
    expect(() =>
      authService.audit(token, AuthorizedAction.delete, 1, 'type', 5),
    ).toThrow(new PermissionDeniedError(AuthorizedAction.delete, 1, 'type', 5));
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
});

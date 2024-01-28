/*
 *  Description: This file tests the auth module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import {
  AuthService,
  AuthorizedAction,
  authorizedActionToString,
} from './auth.service';

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
  let jwtService: JwtService;
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    authService = app.get<AuthService>(AuthService);
    jwtService = app.get<JwtService>(JwtService);
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
});

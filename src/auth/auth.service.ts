/*
 *  Description: This file implements the auth service, which is used for
 *               authentication and authorization.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Ajv from 'ajv';
import { readFileSync } from 'fs';
import path from 'node:path';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
  PermissionDeniedError,
  TokenExpiredError,
} from './auth.error';
import { Authorization, AuthorizedAction, TokenPayload } from './definitions';
import { CustomAuthLogics } from './custom-auth-logic';

@Injectable()
export class AuthService {
  public static instance: AuthService;
  public customAuthLogics: CustomAuthLogics = new CustomAuthLogics();

  constructor(private readonly jwtService: JwtService) {
    AuthService.instance = this;
    const tokenPayloadSchemaRaw = readFileSync(
      path.resolve(__dirname, '../../src/auth/token-payload.schema.json'),
      'utf8',
    );
    const tokenPayloadSchema = JSON.parse(tokenPayloadSchemaRaw);
    this.isTokenPayloadValidate = new Ajv().compile(tokenPayloadSchema);
  }

  private isTokenPayloadValidate: (payload: any) => boolean;

  private decodePayload(data: any): TokenPayload {
    const payload = data.payload;
    if (payload == undefined || !this.isTokenPayloadValidate(payload)) {
      throw new Error(
        'The token is valid, but the payload of the token is' +
          ' not a TokenPayload object. This is ether a bug or a malicious attack.',
      );
    }
    return payload as TokenPayload;
  }

  private encodePayload(payload: TokenPayload): any {
    return { payload: payload };
  }

  // Sign a token for an authorization.
  sign(authorization: Authorization, validSeconds: number = 60): string {
    const now = Date.now();
    const payload: TokenPayload = {
      authorization: authorization,
      signedAt: now,
      validUntil: now + validSeconds * 1000,
    };
    return this.jwtService.sign(this.encodePayload(payload));
  }

  // Verify a token and decodes its payload.
  //
  // If the token is invalid, for example, malformed, missigned or expired,
  // an exception will be thrown by jwtService.verify().
  //
  // If the token is valid but the payload is not an Authorization object,
  // TokenFormatError will be thrown.
  //
  // Parameters:
  //    token: both the pure jwt token and the one with "Bearer " or "bearer " are supported.
  verify(token: string | undefined): Authorization {
    if (token == undefined || token == '')
      throw new AuthenticationRequiredError();
    if (token.indexOf('Bearer ') == 0) token = token.slice(7);
    else if (token.indexOf('bearer ') == 0) token = token.slice(7);

    let result: any;
    try {
      result = this.jwtService.verify(token);
    } catch {
      throw new InvalidTokenError();
    }

    const payload = this.decodePayload(result);

    if (Date.now() > payload.validUntil) throw new TokenExpiredError();

    return payload.authorization;
  }

  // If the toke is invalid, or the operation is not permitted, an exception is thrown.
  //
  // If resourceOwnerId, resourceType or resourceId is undefined, it means the resource has
  // no owner, type or id. Only the AuthorizedResource object whose ownedByUser, types
  // or resourceIds is undefined or contains a undefined can matches such a resource which has
  // no owner, type or id.
  async audit(
    token: string | undefined,
    action: AuthorizedAction,
    resourceOwnerId?: number,
    resourceType?: string,
    resourceId?: number,
  ): Promise<void> {
    const authorization = this.verify(token);
    await this.auditWithoutToken(
      authorization,
      action,
      resourceOwnerId,
      resourceType,
      resourceId,
    );
  }

  // Do the same thing as audit(), but without a token.
  async auditWithoutToken(
    authorization: Authorization,
    action: AuthorizedAction,
    resourceOwnerId?: number,
    resourceType?: string,
    resourceId?: number,
  ): Promise<void> {
    // In many situations, the coders may forget to convert the string to number.
    // So we do it here.
    // Addition: We think this hides problems; so we remove it.
    //if (typeof resourceOwnerId == "string")
    //  resourceOwnerId = Number.parseInt(resourceOwnerId as any as string);
    //if (typeof resourceId == "string")
    //  resourceId = Number.parseInt(resourceId as any as string);
    if (resourceOwnerId !== undefined && typeof resourceOwnerId != 'number') {
      //Logger.error(typeof resourceOwnerId);
      throw new Error('resourceOwnerId must be a number.');
    }
    if (resourceId !== undefined && typeof resourceId != 'number') {
      //Logger.error(typeof resourceId);
      throw new Error('resourceId must be a number.');
    }
    for (const permission of authorization.permissions) {
      let actionMatches =
        permission.authorizedActions === undefined ? true : false;
      if (permission.authorizedActions !== undefined) {
        for (const authorizedAction of permission.authorizedActions) {
          if (authorizedAction === action) {
            actionMatches = true;
          }
        }
      }
      if (actionMatches == false) continue;
      // Now, action matches.

      if (
        (permission.authorizedResource.ownedByUser === undefined ||
          permission.authorizedResource.ownedByUser === resourceOwnerId) !==
        true
      )
        continue;
      // Now, owner matches.

      let typeMatches =
        permission.authorizedResource.types === undefined ? true : false;
      if (permission.authorizedResource.types !== undefined) {
        for (const authorizedType of permission.authorizedResource.types) {
          if (authorizedType === resourceType) {
            typeMatches = true;
          }
        }
      }
      if (typeMatches == false) continue;
      // Now, type matches.

      let idMatches =
        permission.authorizedResource.resourceIds === undefined ? true : false;
      if (permission.authorizedResource.resourceIds !== undefined) {
        for (const authorizedId of permission.authorizedResource.resourceIds) {
          if (authorizedId === resourceId) {
            idMatches = true;
          }
        }
      }
      if (idMatches == false) continue;
      // Now, id matches.

      if (permission.customLogic !== undefined) {
        const result = await this.customAuthLogics.invoke(
          permission.customLogic,
          authorization.userId,
          action,
          resourceOwnerId,
          resourceType,
          resourceId,
          permission.customLogicData,
        );
        if (result !== true) continue;
      }
      // Now, custom logic matches.

      // Action, owner, type and id matches, so the operation is permitted.
      return;
    }
    throw new PermissionDeniedError(
      action,
      resourceOwnerId,
      resourceType,
      resourceId,
    );
  }

  // Decode a token, WITHOUT verifying it.
  decode(token: string | undefined): TokenPayload {
    if (token == undefined || token == '')
      throw new AuthenticationRequiredError();
    if (token.indexOf('Bearer ') == 0) token = token.slice(7);
    else if (token.indexOf('bearer ') == 0) token = token.slice(7);
    const result = this.jwtService.decode(token);
    return this.decodePayload(result);
  }
}

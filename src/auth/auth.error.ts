/*
 *  Description: This file defines the errors that can be thrown by the AuthService.
 *               All the Errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';
import { AuthorizedAction, authorizedActionToString } from './auth.service';

export class AuthenticationRequiredError extends BaseError {
  constructor() {
    super('AuthenticationRequiredError', 'Authentication required', 401);
  }
}

export class InvalidTokenError extends BaseError {
  constructor() {
    super('InvalidTokenError', 'Invalid token', 401);
  }
}

export class TokenExpiredError extends BaseError {
  constructor() {
    super('TokenExpiredError', 'Token expired', 401);
  }
}

export class PermissionDeniedError extends BaseError {
  constructor(
    public readonly action: AuthorizedAction,
    public readonly resourceOwnerId?: number,
    public readonly resourceType?: string,
    public readonly resourceId?: number,
  ) {
    super(
      'PermissionDeniedError',
      `The attempt to perform action '${authorizedActionToString(
        action,
      )}' on resource (resourceOwnerId: ${resourceOwnerId}, resourceType: ${resourceType}, resourceId: ${resourceId}) is not permitted by the given token.`,
      403,
    );
  }
}

export class SessionExpiredError extends BaseError {
  constructor() {
    super('SessionExpiredError', 'Session expired', 401);
  }
}

export class SessionRevokedError extends BaseError {
  constructor() {
    super('SessionRevokedError', 'Session revoked', 401);
  }
}

export class RefreshTokenAlreadyUsedError extends BaseError {
  constructor() {
    super(
      'RefreshTokenAlreadyUsedError',
      'The refresh token has already been used. A refresh token can only be used once.',
      401,
    );
  }
}

export class NotRefreshTokenError extends BaseError {
  constructor() {
    super(
      'NotRefreshTokenError',
      'The token is not a refresh token. A refresh token is required.',
      401,
    );
  }
}

// src/users/security/errors/security.error.ts
import { BaseError } from '../../../common/error/base-error';

export class InvalidPublicKeyError extends BaseError {
  constructor(message: string = 'Invalid public key provided.') {
    super('InvalidPublicKeyError', message, 422);
  }
}

export class TOTPAlreadyEnabledError extends BaseError {
  constructor(userId: number) {
    super('TOTPAlreadyEnabledError', `TOTP is already enabled for user ID ${userId}.`, 409);
  }
}

export class TOTPNotEnabledError extends BaseError {
  constructor(userId: number) {
    super('TOTPNotEnabledError', `TOTP is not enabled for user ID ${userId}. Cannot perform this operation.`, 400);
  }
}

export class InvalidBackupCodeError extends BaseError {
  constructor() {
    super('InvalidBackupCodeError', 'The provided backup code is invalid or has already been used.', 400);
  }
}

export class OAuthConnectionNotFoundError extends BaseError {
    constructor(connectionId: number) {
        super('OAuthConnectionNotFoundError', `OAuth connection with ID ${connectionId} not found.`, 404);
    }
}

export class OAuthProviderAlreadyLinkedError extends BaseError {
    constructor(providerId: string) {
        super('OAuthProviderAlreadyLinkedError', `An account from ${providerId} is already linked.`, 409);
    }
}

export class CannotUnbindLastLoginMethodError extends BaseError {
    constructor() {
        super('CannotUnbindLastLoginMethodError', 'Cannot unbind the only authentication method. Please set a password or add another OAuth provider first.', 400);
    }
}

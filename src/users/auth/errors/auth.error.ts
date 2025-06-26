// src/users/auth/errors/auth.error.ts
import { BaseError } from '../../../common/error/base-error';

export class PasswordNotMatchError extends BaseError {
  constructor(public readonly username: string) {
    super(
      'PasswordNotMatchError',
      `Password not match for user ${username}`,
      401,
    );
  }
}

export class ChallengeNotFoundError extends BaseError {
  constructor() {
    super('ChallengeNotFoundError', 'Challenge not found', 404);
  }
}

export class PasskeyVerificationFailedError extends BaseError {
  constructor() {
    super('PasskeyVerificationFailedError', 'Passkey verification failed', 400);
  }
}

export class PasskeyNotFoundError extends BaseError {
  constructor(credentialId: string) {
    super(
      'PasskeyNotFoundError',
      `Passkey not found. ID: ${credentialId.substring(0, 8)}...`,
      404,
    );
  }
}

export class TOTPRequiredError extends BaseError {
  constructor(
    username: string,
    public readonly tempToken: string,
  ) {
    super(
      'TOTPRequiredError',
      `2FA verification required for user '${username}'`,
      401,
    );
  }
}

export class TOTPInvalidError extends BaseError {
  constructor() {
    super('TOTPInvalidError', 'Invalid 2FA code', 400);
  }
}

export class TOTPTempTokenInvalidError extends BaseError {
  constructor() {
    super(
      'TOTPTempTokenInvalidError',
      'Invalid or expired temporary token for 2FA verification',
      400,
    );
  }
}

export class SrpNotUpgradedError extends BaseError {
  constructor(username: string) {
    super(
      'SrpNotUpgradedError',
      `User ${username} has not been upgraded to SRP authentication.`,
      401,
    );
  }
}

export class SrpVerificationError extends BaseError {
  constructor() {
    super('SrpVerificationError', 'SRP verification failed.', 401);
  }
}

export class OAuthSrpVerificationRequiredError extends BaseError {
  constructor(
    public email: string,
    public providerId: string,
    public salt: string,
    public serverPublicEphemeral: string,
    public srpSessionId: string,
  ) {
    super(
      'OAuthSrpVerificationRequiredError',
      `OAuth login requires SRP verification for email: ${email}`,
      422, // Or 401 if considered an auth challenge
    );
  }
}

export class OAuthLegacyPasswordRequiredError extends BaseError {
  constructor(
    public email: string,
    public providerId: string,
    public oauthSessionId: string,
  ) {
    super(
      'OAuthLegacyPasswordRequiredError',
      `OAuth login requires password verification and SRP upgrade for email: ${email}`,
      422, // Or 401
    );
  }
}

export class OAuthAccountChoiceRequiredError extends BaseError {
  constructor(
    public email: string,
    public providerId: string,
    public oauthUserInfo: any, // Consider defining a more specific type
    public existingUsername: string,
  ) {
    super(
      'OAuthAccountChoiceRequiredError',
      `Email ${email} is already registered. Account choice required.`,
      409, // Conflict
    );
  }
}

export class InvalidLoginCredentialsError extends BaseError {
  constructor() {
    super('InvalidLoginCredentialsError', 'Invalid username or password.', 401);
  }
}

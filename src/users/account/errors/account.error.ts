// src/users/account/errors/account.error.ts
import { BaseError } from '../../../common/error/base-error';

export class InvalidEmailAddressError extends BaseError {
  constructor(public readonly email: string) {
    super(
      'InvalidEmailAddressError',
      `Invalid email address: ${email}. Email should look like someone@example.com`,
      422,
    );
  }
}

export class InvalidEmailSuffixError extends BaseError {
  constructor(
    public readonly email: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidEmailSuffixError',
      `Invalid email suffix: ${email}. ${rule}`,
      422,
    );
  }
}

export class EmailAlreadyRegisteredError extends BaseError {
  constructor(public readonly email: string) {
    super(
      'EmailAlreadyRegisteredError',
      `Email already registered: ${email}`,
      409,
    );
  }
}

export class EmailSendFailedError extends BaseError {
  constructor(public readonly email: string) {
    super('EmailSendFailedError', `Failed to send email to ${email}`, 500);
  }
}

export class InvalidUsernameError extends BaseError {
  constructor(
    public readonly username: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidUsernameError',
      `Invalid username: ${username}. ${rule}`,
      422,
    );
  }
}

export class InvalidNicknameError extends BaseError {
  constructor(
    public readonly nickname: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidNicknameError',
      `Invalid nickname: ${nickname}. ${rule}`,
      422,
    );
  }
}

export class InvalidPasswordError extends BaseError {
  constructor(public readonly rule: string) {
    super('InvalidPasswordError', `Invalid password. ${rule}`, 422);
  }
}

export class UsernameAlreadyRegisteredError extends BaseError {
  constructor(public readonly username: string) {
    super(
      'UsernameAlreadyRegisteredError',
      `Username already registered: ${username}`,
      409,
    );
  }
}

export class CodeNotMatchError extends BaseError {
  constructor(
    public readonly emailOrIdentifier: string, // Made generic for email or other identifiers if needed
    public readonly code: string,
  ) {
    super('CodeNotMatchError', `Code not match for: ${emailOrIdentifier}, code: ${code}`, 422);
  }
}

export class UserIdNotFoundError extends BaseError {
  constructor(public readonly userId: number) {
    super('UserIdNotFoundError', `User with id ${userId} not found`, 404);
  }
}

export class UsernameNotFoundError extends BaseError {
  constructor(public readonly username: string) {
    super(
      'UsernameNotFoundError',
      `User with username ${username} not found`,
      404,
    );
  }
}

export class EmailNotFoundError extends BaseError {
  constructor(public readonly email: string) {
    super('EmailNotFoundError', `Email not found: ${email}`, 404);
  }
}

export class UpdateAvatarError extends BaseError { // Assuming this relates to updating profile avatar
  constructor(message: string = 'Cannot use avatar loaded by others.') { // Default message if specific one not needed
    super('UpdateAvatarError', message, 403);
  }
}

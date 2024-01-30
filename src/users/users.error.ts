/*
 *  Description: This file defines the errors related to users service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class InvalidEmailAddressError extends BaseError {
  constructor(
    public readonly email: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidEmailAddressError',
      `Invalid email address: ${email}. ${rule}`,
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
    public readonly email: string,
    public readonly code: string,
  ) {
    super('CodeNotMatchError', `Code not match: ${email}, ${code}`, 422);
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

export class PasswordNotMatchError extends BaseError {
  constructor(public readonly username: string) {
    super(
      'PasswordNotMatchError',
      `Password not match for user ${username}`,
      401,
    );
  }
}

export class EmailNotFoundError extends BaseError {
  constructor(public readonly email: string) {
    super('EmailNotFoundError', `Email not found: ${email}`, 404);
  }
}

export class UserNotFollowedYetError extends BaseError {
  constructor(public readonly followeeId: number) {
    super(
      'UserNotFollowedYetError',
      `User with id ${followeeId} is not followed yet.`,
      422,
    );
  }
}

export class FollowYourselfError extends BaseError {
  constructor() {
    super('FollowYourselfError', 'Cannot follow yourself.', 422);
  }
}

export class UserAlreadyFollowedError extends BaseError {
  constructor(public readonly followeeId: number) {
    super(
      'UserAlreadyFollowedError',
      `User with id ${followeeId} already followed.`,
      422,
    );
  }
}

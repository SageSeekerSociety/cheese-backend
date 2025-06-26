// src/users/relationships/errors/relationships.error.ts
import { BaseError } from '../../../common/error/base-error';

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

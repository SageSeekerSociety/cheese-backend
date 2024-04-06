/*
 *  Description: This file defines the errors related to questions service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';
export const BOUNTY_LIMIT = 20;
export class QuestionNotFoundError extends BaseError {
  constructor(id: number) {
    super('QuestionNotFoundError', `Question with id ${id} is not found.`, 404);
  }
}

export class QuestionAlreadyFollowedError extends BaseError {
  constructor(id: number) {
    super(
      'QuestionAlreadyFollowedError',
      `Question with id ${id} is already followed.`,
      400,
    );
  }
}

export class QuestionNotFollowedYetError extends BaseError {
  constructor(id: number) {
    super(
      'QuestionNotFollowedYetError',
      `Question with id ${id} is not followed yet.`,
      400,
    );
  }
}

export class QuestionInvitationNotFoundError extends BaseError {
  constructor(id: number) {
    super(
      'QuestionInvitationNotFoundError',
      `Question invitation with id ${id} is not found.`,
      400,
    );
  }
}
export class QuestionNotHasThisTopicError extends BaseError {
  constructor(id: number, topicId: number) {
    super(
      'QuestionNotHasThisTopicError',
      `Question with id ${id} does not have topic with id ${topicId}.`,
      400,
    );
  }
}

export class BountyOutOfLimitError extends BaseError {
  constructor(bounty: number) {
    super(
      'BountyOutOfLimitError',
      `Bounty ${bounty} is outside the limit of 0 and ${BOUNTY_LIMIT}.`,
      400,
    );
  }
}
export class UserAlreadyInvitedError extends BaseError {
  constructor(id: number) {
    super(
      'UserAlreadyInvitedError',
      `User with id ${id} is already invited.`,
      400,
    );
  }
}

export class AlreadyAnsweredError extends BaseError {
  constructor(id: number) {
    super(
      'AlreadyAnsweredError',
      `User with id ${id} has already answered the question.`,
      400,
    );
  }
}

export class BountyNotBiggerError extends BaseError {
  constructor(id: number, bounty: number) {
    super(
      'BountyNotBiggerError',
      `Bounty ${bounty} is not bigger than the current bounty of question ${id}.`,
      400,
    );
  }
}

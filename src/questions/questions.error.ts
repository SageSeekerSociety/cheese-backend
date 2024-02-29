/*
 *  Description: This file defines the errors related to questions service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class QuestionIdNotFoundError extends BaseError {
  constructor(id: number) {
    super(
      'QuestionIdNotFoundError',
      `Question with id ${id} is not found.`,
      404,
    );
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

export class QuestionNotHasThisTopicError extends BaseError {
  constructor(id: number, topicId: number) {
    super(
      'QuestionNotHasThisTopicError',
      `Question with id ${id} does not have topic with id ${topicId}.`,
      400,
    );
  }
}

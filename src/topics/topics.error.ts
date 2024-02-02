/*
 *  Description: This file defines the errors related to topics service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class TopicAlreadyExistsError extends BaseError {
  constructor(topicName: string) {
    super(
      'TopicAlreadyExistsError',
      `Topic '${topicName}' already exists.`,
      409,
    );
  }
}

export class TopicNotFoundError extends BaseError {
  constructor(topicId: number) {
    super('TopicNotFoundError', `Topic with id '${topicId}' not found.`, 404);
  }
}

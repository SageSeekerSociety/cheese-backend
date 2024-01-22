/*
 *  Description: This file defines the errors related to questions service.
 *               All the errors should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class QuestionNotFoundError extends BaseError {
  constructor(id: number) {
    super('QuestionNotFoundError', `Question with id ${id} is not found.`, 404);
  }
}

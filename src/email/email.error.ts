/*
 *  Description: This file defines the errors related to email service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class EmailPolicyViolationError extends BaseError {
  constructor(public readonly email: string) {
    super('EmailPolicyViolationError', `Email policy violation: ${email}`, 422);
  }
}

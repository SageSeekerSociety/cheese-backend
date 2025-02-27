/*
 *  Description: This file defines the errors related to attitude service.
 *               All the errors in this file should extend BaseError.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class InvalidAttitudeTypeError extends BaseError {
  constructor(attitude: string) {
    super(
      'InvalidAttitudeTypeError',
      `Invalid attitude type: ${attitude}`,
      400,
    );
  }
}

export class InvalidAttitudableTypeError extends BaseError {
  constructor(attitudableType: string) {
    super(
      'InvalidAttitudableTypeError',
      `Invalid attitudable type: ${attitudableType}`,
      400,
    );
  }
}

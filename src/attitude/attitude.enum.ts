/*
 *  Description: This file implements the parser for enum Attitude.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { AttitudeType } from '@prisma/client';
import { InvalidAttitudeTypeError } from './attitude.error';

export function parseAttitude(attitude: string): AttitudeType {
  attitude = attitude.toUpperCase();
  switch (attitude) {
    case 'UNDEFINED':
      return AttitudeType.UNDEFINED;
    case 'POSITIVE':
      return AttitudeType.POSITIVE;
    case 'NEGATIVE':
      return AttitudeType.NEGATIVE;
  }
  throw new InvalidAttitudeTypeError(attitude);
}

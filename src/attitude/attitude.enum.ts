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
    case 'LIKE':
      return AttitudeType.LIKE;
    case 'DISLIKE':
      return AttitudeType.DISLIKE;
    case 'AGREE':
      return AttitudeType.AGREE;
    case 'DISAGREE':
      return AttitudeType.DISAGREE;
  }
  throw new InvalidAttitudeTypeError(attitude);
}

/*
 *  Description: This file implements the parser for enum Attitudable.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { AttitudableType } from '@prisma/client';
import { InvalidAttitudableTypeError } from './attitude.error';

export function parseAttitudable(attitudable: string): AttitudableType {
  attitudable = attitudable.toUpperCase();
  switch (attitudable) {
    case 'COMMENT':
      return AttitudableType.COMMENT;
    case 'QUESTION':
      return AttitudableType.QUESTION;
  }
  throw new InvalidAttitudableTypeError(attitudable);
}

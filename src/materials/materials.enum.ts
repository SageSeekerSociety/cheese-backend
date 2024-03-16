/*
 *  Description: This file implements the parser for enum Attitude.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { MaterialType } from '@prisma/client';
import { InvalidMaterialTypeError } from './materials.error';

export function parseMaterial(material: string): MaterialType {
  switch (material) {
    case 'image':
      return MaterialType.IMAGE;
    case 'video':
      return MaterialType.VIDEO;
    case 'file':
      return MaterialType.FILE;
  }
  throw new InvalidMaterialTypeError();
}

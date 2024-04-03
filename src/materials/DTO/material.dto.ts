import { MaterialType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class MaterialTypeDto {
  @IsEnum(MaterialType)
  type: MaterialType;
}

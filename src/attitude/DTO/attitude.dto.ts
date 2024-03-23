import { AttitudeType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AttitudeTypeDto {
  @IsEnum(AttitudeType)
  attitude_type: AttitudeType;
}

import { AttitudeType } from '@prisma/client';

export class AttitudeStateDto {
  positive_count: number;
  negative_count: number;
  difference: number; // defined as (positive_count - negative_count)
  user_attitude: AttitudeType;

  constructor(
    positive_count: number,
    negative_count: number,
    user_attitude: AttitudeType,
  ) {
    this.positive_count = positive_count;
    this.negative_count = negative_count;
    this.difference = positive_count - negative_count;
    this.user_attitude = user_attitude;
  }
}

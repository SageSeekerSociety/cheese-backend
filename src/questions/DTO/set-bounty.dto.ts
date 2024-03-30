import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { BOUNTY_LIMIT } from '../questions.error';

export class SetBountyDto {
  @IsInt()
  @Min(1, { message: 'Bounty must be positive when setting' })
  @Max(BOUNTY_LIMIT, {
    message: 'Bounty is too high',
  })
  @Type(() => Number)
  bounty: number;
}

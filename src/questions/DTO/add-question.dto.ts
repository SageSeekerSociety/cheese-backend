import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { BOUNTY_LIMIT } from '../questions.error';

export class AddQuestionRequestDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  type: number;

  @IsArray()
  @IsInt({ each: true })
  topics: number[];

  @IsInt()
  @IsOptional()
  groupId?: number;

  @IsInt()
  @Min(0, { message: 'Bounty can not be negative' })
  @Max(BOUNTY_LIMIT, { message: 'Bounty is too high' })
  @IsOptional()
  @Type(() => Number)
  bounty: number = 0;
}

export class AddQuestionResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateAnswerDto {
  @IsString()
  // @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  topics: number[];

  @IsInt()
  @IsOptional()
  groupId: number;
}

export class UpdateRespondAnswerDto extends BaseRespondDto {}

import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { Answer } from '../answer.entity';

export class UpdateAnswerDto {
  @IsString()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  type: Answer;

  @IsArray()
  topics: number[];

  @IsInt()
  groupId: number;

}

export class UpdateRespondAnswerDto extends BaseRespondDto {}

import { IsArray, IsInt, IsString } from 'class-validator';
import { Answer } from '../answer.entity';

export class  CreateAnswerDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  type: Answer;

  @IsArray()
  topics: number[];

  @IsInt()
  groupId: number;
}


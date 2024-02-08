import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Answer } from '../answer.entity';

export class  UpdateAnswerDto {
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
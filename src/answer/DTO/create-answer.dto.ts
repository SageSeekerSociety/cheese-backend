import { IsArray, IsInt, IsString } from 'class-validator';

export class  CreateAnswerDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  type: number;

  @IsArray()
  topics: number[];

  @IsInt()
  groupId: number;
}
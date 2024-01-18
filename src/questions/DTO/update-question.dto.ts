import { IsArray, IsInt, IsString } from 'class-validator';

export class UpdateQuestionRequestDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  type: number;

  @IsArray()
  topics: number[];
}

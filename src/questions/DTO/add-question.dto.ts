import { IsArray, IsInt, IsString } from 'class-validator';

export class AddQuestionRequestDto {
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

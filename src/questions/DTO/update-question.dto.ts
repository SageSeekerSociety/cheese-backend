import { IsArray, IsInt, IsString } from 'class-validator';

export class UpdateQuestionRequestDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  type: number;

  @IsArray()
  @IsInt({ each: true })
  topics: number[];
}

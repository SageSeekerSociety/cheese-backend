import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateAnswerRequestDto {
  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  topics: number[];

  @IsInt()
  @IsOptional()
  group_id: number;
}

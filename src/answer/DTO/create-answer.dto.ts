import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  content: string;

  @IsInt()
  questionId: number;

  @IsInt()
  @IsOptional()
  readonly type: number;

  @IsArray()
  @IsOptional()
  readonly topics: number[];

  @IsInt()
  @IsOptional()
  readonly groupId: number;
}

export class CreateAnswerRespondDto {
  @IsInt()
  readonly answerId: number;
}

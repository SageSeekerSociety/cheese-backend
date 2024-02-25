import { IsArray, IsInt, IsString } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  readonly title: string;

  @IsString()
  readonly content: string;

  @IsInt()
  readonly type: number;

  @IsArray()
  readonly topics: number[];

  @IsInt()
  readonly groupId: number;
}

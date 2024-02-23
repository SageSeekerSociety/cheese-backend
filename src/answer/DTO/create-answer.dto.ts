import { IsArray, IsInt, IsString } from 'class-validator';
import { Answer } from '../answer.entity';

export class CreateAnswerDto {
  @IsString()
  readonly title: string;

  @IsString()
  readonly content: string;

  @IsInt()
  readonly type: Answer;

  @IsArray()
  readonly topics: number[];

  @IsInt()
  readonly groupId: number;
}

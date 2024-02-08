<<<<<<< HEAD
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

=======
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

>>>>>>> 83ea520ad8240ad4d5d3dc581b8856d4c16babc9

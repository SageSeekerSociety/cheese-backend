<<<<<<< HEAD
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

=======
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

>>>>>>> 83ea520ad8240ad4d5d3dc581b8856d4c16babc9
}
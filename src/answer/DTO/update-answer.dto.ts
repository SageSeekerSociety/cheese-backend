import { IsArray, IsInt, IsString, IsNotEmpty } from 'class-validator';

export class  UpdateAnswerDto {
  @IsString()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  type: number;

  @IsArray()
  topics: number[];

  @IsInt()
  groupId: number;

}
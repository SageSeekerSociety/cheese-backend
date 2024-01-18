import { IsArray, IsInt, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

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

export class AddQuestionResponseDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

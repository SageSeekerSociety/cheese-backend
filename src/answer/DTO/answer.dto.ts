import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class AnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  // agree_type: number;
}

export class AnswerRespondDto extends BaseRespondDto {
  data: AnswerDto;
}
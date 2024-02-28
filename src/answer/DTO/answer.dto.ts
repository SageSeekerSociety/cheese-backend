import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class AnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  favorite_count: number;
}

export class AnswerRespondDto extends BaseRespondDto {
  data: AnswerDto;
}

export class AnswerDetailRespondDto extends BaseRespondDto {
  data: AnswerDto;
}

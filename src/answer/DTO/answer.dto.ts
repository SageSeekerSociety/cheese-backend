import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { User } from '../../users/users.legacy.entity';

export class AnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: User;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  favorite_count: number;
}

export class AnswerRespondDto extends BaseRespondDto {
  data: AnswerDto;
}
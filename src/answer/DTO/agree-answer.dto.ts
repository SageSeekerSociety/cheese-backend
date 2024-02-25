import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { User } from '../../users/users.legacy.entity';

export class AgreeAnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: User;
  agree_type: number;
  agree_count: number;
  disagree_count: number;
}

export class AgreeAnswerRespondDto extends BaseRespondDto {
  data: AgreeAnswerDto;
}
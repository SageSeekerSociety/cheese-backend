import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class AgreeAnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: UserDto;
  agree_type: number;
  agree_count: number;
  disagree_count: number;
}

export class AgreeAnswerRespondDto extends BaseRespondDto {
  data: AgreeAnswerDto;
}

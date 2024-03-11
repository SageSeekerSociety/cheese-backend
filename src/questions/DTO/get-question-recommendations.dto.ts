import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetQuestionRecommentdationsRespondDto extends BaseRespondDto {
  data: {
    users: UserDto[];
  };
}

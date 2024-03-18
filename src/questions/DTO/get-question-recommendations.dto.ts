import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetQuestionRecommendationsRespondDto extends BaseRespondDto {
  data: {
    users: UserDto[];
  };
}

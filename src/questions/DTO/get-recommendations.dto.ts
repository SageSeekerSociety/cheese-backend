import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class GetRecommentdations {
  users: UserDto[];
}

export class GetRecommentdationsRespondDto extends BaseRespondDto {
  data: GetRecommentdations;
}

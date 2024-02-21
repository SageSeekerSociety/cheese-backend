import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from './user.dto';

export class GetUserRespondDto extends BaseRespondDto {
  data: {
    user: UserDto;
  };
}

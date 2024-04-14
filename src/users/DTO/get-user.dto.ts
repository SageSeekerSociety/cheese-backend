import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from './user.dto';

export class GetUserResponseDto extends BaseResponseDto {
  data: {
    user: UserDto;
  };
}

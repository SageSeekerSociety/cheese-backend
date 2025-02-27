import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { UserDto } from './user.dto';

export class GetFollowersResponseDto extends BaseResponseDto {
  data: {
    users: UserDto[];
    page: PageDto;
  };
}

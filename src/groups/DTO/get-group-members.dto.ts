import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetGroupMembersResponseDto extends BaseResponseDto {
  data: {
    members: UserDto[];
    page?: PageDto;
  };
}

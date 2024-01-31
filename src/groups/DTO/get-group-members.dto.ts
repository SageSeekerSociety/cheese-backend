import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetGroupMembersRespondDto extends BaseRespondDto {
  data: {
    members: UserDto[];
    page?: PageRespondDto;
  };
}

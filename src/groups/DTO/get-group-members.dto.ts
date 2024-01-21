import { BaseRespondDto } from "../../common/DTO/base-respond.dto";
import { PageRespondDto } from "../../common/DTO/page-respond.dto";
import { UserDto } from "../../users/DTO/user.dto";

export class GetGroupMembersResultDto {
  members: UserDto[];
  page: PageRespondDto;
}

export class GetGroupMembersRespondDto extends BaseRespondDto {
  data: GetGroupMembersResultDto;
}
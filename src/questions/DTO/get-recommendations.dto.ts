import { BaseRespondDto } from "../../common/DTO/base-respond.dto";
import { User } from "../../users/users.legacy.entity";
export class GetRecommentdations {
  users:User[];
}

export class GetRecommentdationsRespondDto extends BaseRespondDto {
  data: GetRecommentdations;
}
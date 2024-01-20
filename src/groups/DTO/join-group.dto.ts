import { IsString } from "class-validator";
import { BaseRespondDto } from "../../common/DTO/base-respond.dto";

export class JoinGroupDto {
  @IsString()
  readonly intro: string;
}

export class JoinGroupRespondDto extends BaseRespondDto {
  data: {
    member_count: number,
    is_member: boolean,
    is_waiting: boolean,
  };
}
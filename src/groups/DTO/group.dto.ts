import { IsInt, IsString } from "class-validator";
import { BaseRespondDto } from "../../common/DTO/base-respond.dto";

export class GroupDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  intro: string;

  @IsString()
  avatar: string;
}

export class GroupRespondDto extends BaseRespondDto {
  data: GroupDto;
}
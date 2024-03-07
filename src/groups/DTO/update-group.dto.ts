import { IsInt, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  // todo: add cover
}
export class UpdateGroupAvatarDto {
  @IsInt()
  readonly avatar: number;
}

export class UpdateGroupRespondDto extends BaseRespondDto {}

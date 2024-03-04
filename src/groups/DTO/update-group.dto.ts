import { IsInt, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsInt()
  readonly avatar: number;

  // todo: add cover
}

export class UpdateGroupRespondDto extends BaseRespondDto {}

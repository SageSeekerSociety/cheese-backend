import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsString()
  readonly avatar: string;

  // todo: add cover
}

export class UpdateGroupRespondDto extends BaseRespondDto {}

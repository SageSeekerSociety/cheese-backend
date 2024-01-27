import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsString()
  readonly avatar: string;

  @IsString()
  readonly cover: string;
}

export class UpdateGroupRespondDto extends BaseRespondDto {}

import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateUserRequestDto {
  @IsString()
  nickname: string;

  @IsString()
  avatar: string;

  @IsString()
  intro: string;
}

export class UpdateUserRespondDto extends BaseRespondDto {}

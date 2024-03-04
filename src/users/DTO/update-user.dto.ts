import { IsInt, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateUserRequestDto {
  @IsString()
  nickname: string;

  @IsInt()
  avatar: number;

  @IsString()
  intro: string;
}

export class UpdateUserRespondDto extends BaseRespondDto {}

import { IsInt, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateUserRequestDto {
  @IsString()
  nickname: string;

  @IsString()
  intro: string;

  @IsInt()
  avatarId: number;
}

export class UpdateUserRespondDto extends BaseRespondDto {}

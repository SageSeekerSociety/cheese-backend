import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class ResetPasswordRequestRequestDto {
  @IsString()
  email: string;
}

export class ResetPasswordRequestRespondDto extends BaseRespondDto {}

export class ResetPasswordVerifyRequestDto {
  @IsString()
  token: string;

  @IsString()
  new_password: string;
}

export class ResetPasswordVerifyRespondDto extends BaseRespondDto {}

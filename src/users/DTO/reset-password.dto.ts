import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class ResetPasswordRequestRequestDto {
  @IsString()
  email: string;
}

export interface ResetPasswordRequestRespondDto extends BaseResponseDto {}

export class ResetPasswordVerifyRequestDto {
  @IsString()
  token: string;

  @IsString()
  new_password: string;
}

export interface ResetPasswordVerifyResponseDto extends BaseResponseDto {}

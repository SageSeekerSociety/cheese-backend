import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class ResetPasswordRequestRequestDto {
  @IsString()
  email: string;
}

export class ResetPasswordRequestDto extends BaseResponseDto {}

export class ResetPasswordVerifyRequestDto {
  @IsString()
  token: string;

  @IsString()
  srpSalt: string;

  @IsString()
  srpVerifier: string;
}

export class ResetPasswordVerifyResponseDto extends BaseResponseDto {}

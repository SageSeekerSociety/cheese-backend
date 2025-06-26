import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class ChangePasswordRequestDto {
  @IsString()
  srpSalt: string; // 新密码的 SRP 凭证

  @IsString()
  srpVerifier: string; // 新密码的 SRP 凭证
}

export class ChangePasswordResponseDto extends BaseResponseDto {}

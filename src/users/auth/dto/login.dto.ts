import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from './user.dto';

export class LoginRequestDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class LoginResponseDto extends BaseResponseDto {
  data: {
    user?: UserDto;
    accessToken?: string;
    requires2FA?: boolean;
    tempToken?: string;
    usedBackupCode?: boolean;
  };
}

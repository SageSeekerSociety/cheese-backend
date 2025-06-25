/*
 * Description: OAuth related DTOs
 *
 * Author(s):
 *      HuanCheng65
 */

import { IsOptional, IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from './user.dto';

export class GetOAuthProvidersResponseDto extends BaseResponseDto {
  data: {
    providers: Array<{
      id: string;
      name: string;
      scope: string[];
    }>;
  };
}

export class OAuthCallbackQueryDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}

// OAuth用户DTO，继承自UserDto并添加email字段
export class OAuthUserDto extends UserDto {
  email?: string | null;
}

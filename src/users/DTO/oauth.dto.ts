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

// OAuth 登录响应，支持需要验证的情况
export class OAuthLoginResponseDto extends BaseResponseDto {
  data: {
    user?: OAuthUserDto;
    accessToken?: string;
    requiresVerification?: boolean;
    verificationType?: 'password' | 'srp';
    email?: string;
    salt?: string;
    serverPublicEphemeral?: string;
    sessionId?: string;
  };
}

// 统一的OAuth验证请求
export class OAuthVerifyRequestDto {
  @IsString()
  sessionId: string; // OAuth 会话标识符

  // 密码验证字段
  @IsOptional()
  @IsString()
  password?: string;

  // SRP验证字段
  @IsOptional()
  @IsString()
  clientPublicEphemeral?: string;

  @IsOptional()
  @IsString()
  clientProof?: string;
}

// OAuth 绑定请求
export class OAuthBindRequestDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  accessType?: string;
}

// OAuth 绑定响应
export class OAuthBindResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
    provider: string;
    bindUrl?: string;
  };
}

// 获取用户OAuth连接列表
export class GetUserOAuthConnectionsResponseDto extends BaseResponseDto {
  data: {
    connections: Array<{
      id: number;
      providerId: string;
      providerName: string;
      providerUserId: string;
      connectedAt: string;
    }>;
  };
}

// 解除OAuth绑定响应
export class UnbindOAuthResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
    unboundConnectionId: number;
  };
}

// OAuth SRP绑定初始化请求
export class OAuthSrpBindInitRequestDto {
  @IsString()
  stateToken: string;

  @IsString()
  username: string;
}

// OAuth SRP绑定初始化响应
export class OAuthSrpBindInitResponseDto extends BaseResponseDto {
  data: {
    sessionId: string;
    salt: string;
    serverPublicEphemeral: string;
  };
}

// OAuth SRP绑定验证请求
export class OAuthSrpBindVerifyRequestDto {
  @IsString()
  sessionId: string;

  @IsString()
  clientPublicEphemeral: string;

  @IsString()
  clientProof: string;
}

// OAuth创建用户请求 (仅支持SRP和纯OAuth)
export class OAuthCreateUserRequestDto {
  @IsString()
  stateToken: string;

  @IsString()
  username: string;

  @IsString()
  nickname: string;

  // 可选的SRP凭证 (如果选择SRP方式)
  @IsOptional()
  @IsString()
  srpSalt?: string;

  @IsOptional()
  @IsString()
  srpVerifier?: string;

  // 密码设置模式: 'none' | 'srp' (移除传统密码支持)
  @IsOptional()
  @IsString()
  passwordMode?: 'none' | 'srp';
}

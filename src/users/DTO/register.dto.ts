import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { LoginResponseDto } from './login.dto';

export class RegisterRequestDto {
  @IsString()
  username: string;

  @IsString()
  nickname: string;

  @IsString()
  @IsOptional()
  srpSalt?: string;

  @IsString()
  @IsOptional()
  srpVerifier?: string;

  @IsString()
  email: string;

  @IsString()
  emailCode: string;

  // 可选的传统密码字段，仅用于测试
  @IsString()
  @IsOptional()
  password?: string;

  // 是否使用传统认证方式，仅用于测试
  @IsBoolean()
  @IsOptional()
  isLegacyAuth?: boolean;
}

export class RegisterResponseDto extends LoginResponseDto {}

import { IsInt, IsString } from 'class-validator';
import { LoginRespondDto } from './login.dto';

export class RegisterRequestDto {
  @IsString()
  username: string;

  @IsString()
  nickname: string;

  @IsString()
  password: string;

  @IsString()
  email: string;

  @IsString()
  emailCode: string;

  @IsInt()
  avatar: number;
}

export class RegisterResponseDto extends LoginRespondDto {}

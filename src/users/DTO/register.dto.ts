import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from './user.dto';
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
}

export class RegisterResponseDto extends LoginRespondDto {}

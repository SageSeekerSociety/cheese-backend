import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from './user.dto';

export class LoginRequestDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class LoginRespondDto extends BaseRespondDto {
  data: {
    accessToken: string;
    user: UserDto;
  };
}

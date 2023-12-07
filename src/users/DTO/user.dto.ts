import { IsInt, IsString } from 'class-validator';

export class UserDto {
  @IsInt()
  id: number;

  @IsString()
  username: string;

  @IsString()
  nickname: string;

  @IsString()
  avatar: string;

  @IsString()
  intro: string;
}

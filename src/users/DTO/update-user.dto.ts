import { IsInt, IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class UpdateUserRequestDto {
  @IsString()
  nickname: string;

  @IsString()
  intro: string;

  @IsInt()
  avatarId: number;
}

export class UpdateUserResponseDto extends BaseResponseDto {}

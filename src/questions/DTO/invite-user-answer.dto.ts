import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class inviteUsersAnswerDto {
  @IsInt()
  userId: number;

  @IsBoolean()
  success: boolean;

  
  @IsInt()
  @IsOptional()
  invitation?: number;

  @IsString()
  @IsOptional()
  reason?:
    | 'userNotFound'
    | 'userInvited'
    | 'userAnswered'
    | 'userBanned'
    | 'userBlacklisted';
}

export class inviteUsersAnswerResponseDto extends BaseRespondDto {
  @IsArray()
  data: inviteUsersAnswerDto[];
}

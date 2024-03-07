import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class inviteUsersAnswerDto {
  @IsInt()
  userId: number;

  @IsBoolean()
  success: boolean;

  @IsInt()
  @IsOptional()
  invitationId?: number;
}

export class inviteUsersAnswerResponseDto extends BaseRespondDto {
  data: inviteUsersAnswerDto;
}

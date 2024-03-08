import { IsInt, IsOptional } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class InviteUsersAnswerDto {
  @IsInt()
  userId: number;

  @IsInt()
  @IsOptional()
  invitationId?: number;
}

export class inviteUsersAnswerResponseDto extends BaseRespondDto {
  data: InviteUsersAnswerDto;
}

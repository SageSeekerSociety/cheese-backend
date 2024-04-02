import { IsInt } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class InviteUsersAnswerRequestDto {
  @IsInt()
  user_id: number;
}

export class InviteUsersAnswerResponseDto extends BaseRespondDto {
  data: {
    invitationId: number;
  };
}

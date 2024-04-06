import { IsInt } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class InviteUsersAnswerRequestDto {
  @IsInt()
  user_id: number;
}

export class InviteUsersAnswerResponseDto extends BaseResponseDto {
  data: {
    invitationId: number;
  };
}

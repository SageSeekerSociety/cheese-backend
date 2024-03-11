import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class inviteUsersAnswerResponseDto extends BaseRespondDto {
  data: {
    invitation_id: number;
  };
}

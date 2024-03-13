import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class InviteUsersAnswerResponseDto extends BaseRespondDto {
  data: {
    invitationId: number;
  };
}

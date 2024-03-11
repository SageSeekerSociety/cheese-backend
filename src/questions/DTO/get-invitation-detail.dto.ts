import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { QuestionInvitationDto } from './question-invitation.dto';

export class GetQuestionInvitationDetailResponseDto extends BaseRespondDto {
  data: {
    invitation: QuestionInvitationDto;
  };
}

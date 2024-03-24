import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { QuestionInvitationDto } from './question-invitation.dto';

export class GetQuestionInvitationsResponseDto extends BaseRespondDto {
  data: {
    invitations: QuestionInvitationDto[];
    page: PageRespondDto;
  };
}

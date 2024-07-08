import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { QuestionInvitationDto } from './question-invitation.dto';

export class GetQuestionInvitationDetailResponseDto extends BaseResponseDto {
  data: {
    invitation: QuestionInvitationDto;
  };
}

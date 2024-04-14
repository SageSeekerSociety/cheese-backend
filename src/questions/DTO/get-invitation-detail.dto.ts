import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { QuestionInvitationDto } from './question-invitation.dto';

export interface GetQuestionInvitationDetailResponseDto
  extends BaseResponseDto {
  data: {
    invitation: QuestionInvitationDto;
  };
}

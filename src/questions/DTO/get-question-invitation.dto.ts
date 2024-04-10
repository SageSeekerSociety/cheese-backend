import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { QuestionInvitationDto } from './question-invitation.dto';

export interface GetQuestionInvitationsResponseDto extends BaseResponseDto {
  data: {
    invitations: QuestionInvitationDto[];
    page: PageDto;
  };
}

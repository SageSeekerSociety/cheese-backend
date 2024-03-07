import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class QuestionInvitationDetailDto {
  id: number;
  questionId: number;
  user: UserDto;
  createdAt: Date;
  updatedAt: Date;
  isAnswered: boolean;
}
export class QuestionInvitationDetailResponseDto extends BaseRespondDto {
  data: QuestionInvitationDetailDto;
}

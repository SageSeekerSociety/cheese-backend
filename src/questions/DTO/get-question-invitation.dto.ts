import { IsBoolean, IsInt } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';

export class QuestionInvitationDto {
  @IsInt()
  id: number;

  @IsInt()
  questionId: number;

  @IsInt()
  userId: number;

  @IsInt()
  createAt: Date;

  @IsInt()
  updateAt: Date;

  @IsBoolean()
  isAnswered: boolean;
}
export class GetQuestionInvitationsResponseDto extends BaseRespondDto {
  data: {
    invitations: QuestionInvitationDto[];
    page: PageRespondDto;
  };
}
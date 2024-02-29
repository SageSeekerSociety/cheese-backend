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
  createAt: number;

  @IsInt()
  updateAt: number;

  @IsBoolean()
  isAnswered: boolean;
}
export class GetQuestionInvitationsResponseDto extends BaseRespondDto {
  data: {
    invitions: QuestionInvitationDto[];
    page: PageRespondDto;
  };
}

import { AnswerDto } from '../../answer/DTO/answer.dto';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';

export class GetAnsweredAnswersRespondDto extends BaseRespondDto {
  data: {
    answers: AnswerDto[];
    page: PageRespondDto;
  };
}

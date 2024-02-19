import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { AnswerDto } from './answer.dto';

export class GetAnswersRespondDto extends BaseRespondDto {
  data: {
    answers: AnswerDto[];
    page: PageRespondDto;
  };
}
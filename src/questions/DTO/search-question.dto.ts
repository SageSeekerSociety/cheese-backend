import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { QuestionDto } from './question.dto';

export class SearchQuestionResponseDto extends BaseRespondDto {
  data: {
    questions: QuestionDto[];
    page: PageRespondDto;
  };
}

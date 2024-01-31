import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';

export class GetGroupQuestionsRespondDto extends BaseRespondDto {
  data: {
    questions: QuestionDto[];
    page: PageRespondDto;
  };
}

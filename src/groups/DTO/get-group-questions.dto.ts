import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';

export class GetGroupQuestionsResultDto {
  questions: QuestionDto[];
  page: PageRespondDto;
}

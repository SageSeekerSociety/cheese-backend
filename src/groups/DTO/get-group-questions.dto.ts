import { PageDto } from '../../common/DTO/page-response.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';

export class GetGroupQuestionsResultDto {
  questions: QuestionDto[];
  page: PageDto;
}

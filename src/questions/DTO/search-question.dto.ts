import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { QuestionDto } from './question.dto';

export class SearchQuestionResponseDto extends BaseResponseDto {
  data: {
    questions: QuestionDto[];
    page: PageDto;
  };
}

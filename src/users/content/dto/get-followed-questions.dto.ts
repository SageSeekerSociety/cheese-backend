import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';

export class GetFollowedQuestionsResponseDto extends BaseResponseDto {
  data: {
    questions: QuestionDto[];
    page: PageDto;
  };
}

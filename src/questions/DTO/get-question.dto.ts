import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { QuestionDto } from './question.dto';

export class GetQuestionResponseDto extends BaseResponseDto {
  data: {
    question: QuestionDto;
  };
}

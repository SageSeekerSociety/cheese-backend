import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { QuestionDto } from './question.dto';

export interface GetQuestionResponseDto extends BaseResponseDto {
  data: {
    question: QuestionDto;
  };
}

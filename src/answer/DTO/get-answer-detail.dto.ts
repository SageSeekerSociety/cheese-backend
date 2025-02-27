import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';
import { AnswerDto } from './answer.dto';

export class GetAnswerDetailResponseDto extends BaseResponseDto {
  data: {
    question: QuestionDto;
    answer: AnswerDto;
  };
}

import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { QuestionDto } from '../../questions/DTO/question.dto';
import { AnswerDto } from './answer.dto';

export class GetAnswerDetailRespondDto extends BaseRespondDto {
  data: {
    question: QuestionDto;
    answer: AnswerDto;
  };
}

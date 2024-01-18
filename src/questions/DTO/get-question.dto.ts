import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { QuestionDto } from './question.dto';

export class GetQuestionResponseDto extends BaseRespondDto {
  data: QuestionDto;
}

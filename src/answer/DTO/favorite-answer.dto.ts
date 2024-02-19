import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { AnswerDto } from './answer.dto';

export class FavoriteAnswersRespondDto extends BaseRespondDto {
  data: {
    answer: AnswerDto;
  };
}
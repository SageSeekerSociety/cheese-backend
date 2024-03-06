import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class CreateAnswerRespondDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

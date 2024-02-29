import { IsNumber } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class AgreeAnswerRequestDto {
  @IsNumber()
  agree_type: number;
}

export class AgreeAnswerRespondDto extends BaseRespondDto {
  data: {
    agree_count: number;
  };
}

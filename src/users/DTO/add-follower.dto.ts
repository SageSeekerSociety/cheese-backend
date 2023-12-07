import { IsNumber } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class AddFollowerRespondDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

export class DeleteFollowerRespondDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

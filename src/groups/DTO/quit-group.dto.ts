import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class QuitGroupRespondDto extends BaseRespondDto {
  data: {
    member_count: number;
  };
}

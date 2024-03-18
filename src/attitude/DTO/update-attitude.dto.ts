import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { AttitudeStateDto } from './attitude-state.dto';

export class UpdateAttitudeRespondDto extends BaseRespondDto {
  data: {
    attitudes: AttitudeStateDto;
  };
}

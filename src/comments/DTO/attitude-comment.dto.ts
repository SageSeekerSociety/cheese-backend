import { AttitudeStateDto } from '../../attitude/attitude-state-dto.dto';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class AttitudeCommentDto extends BaseRespondDto {
  data: {
    attitudes: AttitudeStateDto;
  };
}

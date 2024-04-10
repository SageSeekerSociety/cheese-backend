import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { AttitudeStateDto } from './attitude-state.dto';

export interface UpdateAttitudeResponseDto extends BaseResponseDto {
  data: {
    attitudes: AttitudeStateDto;
  };
}

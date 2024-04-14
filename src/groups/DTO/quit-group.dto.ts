import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface QuitGroupResponseDto extends BaseResponseDto {
  data: {
    member_count: number;
  };
}

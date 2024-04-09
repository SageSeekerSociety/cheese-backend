import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class QuitGroupResponseDto extends BaseResponseDto {
  data: {
    member_count: number;
  };
}

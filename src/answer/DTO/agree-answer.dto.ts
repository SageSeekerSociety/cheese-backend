import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface AgreeAnswerResponseDto extends BaseResponseDto {
  data: {
    agree_count: number;
  };
}

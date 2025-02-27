import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class AgreeAnswerResponseDto extends BaseResponseDto {
  data: {
    agree_count: number;
  };
}

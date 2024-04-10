import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface CreateAnswerResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

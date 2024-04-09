import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class CreateAnswerResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

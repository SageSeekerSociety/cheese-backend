import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class CreateCommentResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

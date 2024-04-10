import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface CreateCommentResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

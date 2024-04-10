import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { CommentDto } from './comment.dto';

export interface GetCommentDetailResponseDto extends BaseResponseDto {
  data: {
    comment: CommentDto;
  };
}

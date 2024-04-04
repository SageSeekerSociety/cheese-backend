import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { CommentDto } from './comment.dto';

export class GetCommentDetailResponseDto extends BaseResponseDto {
  data: {
    comment: CommentDto;
  };
}

import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { CommentDto } from './comment.dto';

export class GetCommentDetailResponseDto extends BaseRespondDto {
  data: {
    comment: CommentDto;
  };
}

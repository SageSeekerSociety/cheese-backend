import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { CommentDto } from './comment.dto';

export class GetCommentDetailRespondDto extends BaseRespondDto {
  data: {
    comment: CommentDto;
    sub_comments: CommentDto[];
    page: PageRespondDto;
  };
}

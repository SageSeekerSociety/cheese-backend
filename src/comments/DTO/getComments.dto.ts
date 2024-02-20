import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { CommentDto } from './comment.dto';

export class GetCommentsResponseDto extends BaseRespondDto {
  data: {
    comments: {
      comment: CommentDto;
    }[];
    page: PageRespondDto;
  };
}

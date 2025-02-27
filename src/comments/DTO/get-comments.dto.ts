import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { CommentDto } from './comment.dto';

export class GetCommentsResponseDto extends BaseResponseDto {
  data: {
    comments: CommentDto[];
    page: PageDto;
  };
}

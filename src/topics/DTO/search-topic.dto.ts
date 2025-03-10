import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { TopicDto } from './topic.dto';

export class SearchTopicResponseDto extends BaseResponseDto {
  data: {
    topics: TopicDto[];
    page: PageDto;
  };
}

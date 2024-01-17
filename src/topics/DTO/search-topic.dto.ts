import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { TopicDto } from './topic.dto';

export class SearchTopicResponseDto extends BaseRespondDto {
  data: {
    topics: TopicDto[];
    page: PageRespondDto;
  };
}

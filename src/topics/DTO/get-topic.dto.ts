import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { TopicDto } from './topic.dto';

export class GetTopicResponseDto extends BaseRespondDto {
  data: {
    topic: TopicDto;
  };
}

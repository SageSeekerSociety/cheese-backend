import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { TopicDto } from './topic.dto';

export class GetTopicResponseDto extends BaseResponseDto {
  data: {
    topic: TopicDto;
  };
}

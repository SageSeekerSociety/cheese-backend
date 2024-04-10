import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { TopicDto } from './topic.dto';

export interface GetTopicResponseDto extends BaseResponseDto {
  data: {
    topic: TopicDto;
  };
}

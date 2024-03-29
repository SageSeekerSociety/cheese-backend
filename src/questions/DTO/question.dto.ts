import { AnswerDto } from '../../answer/DTO/answer.dto';
import { AttitudeStateDto } from '../../attitude/DTO/attitude-state.dto';
import { GroupDto } from '../../groups/DTO/group.dto';
import { TopicDto } from '../../topics/DTO/topic.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class QuestionDto {
  id: number;
  title: string;
  content: string;
  author: UserDto | null;
  type: number;
  topics: TopicDto[];
  created_at: number; // timestamp
  updated_at: number; // timestamp
  attitudes: AttitudeStateDto;
  is_follow: boolean;
  my_answer_id: number | null | undefined;
  answer_count: number;
  comment_count: number;
  follow_count: number;
  view_count: number;
  group: GroupDto | null;
  bounty: number;
  bounty_start_at?: number; // timestamp
  accepted_answer: AnswerDto | null;
}

import { AnswerDto } from '../../answer/DTO/answer.dto';
import { GroupDto } from '../../groups/DTO/group.dto';
import { TopicDto } from '../../topics/DTO/topic.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class QuestionDto {
  id: number;
  title: string;
  content: string;
  author: UserDto;
  type: number;
  topics: TopicDto[];
  created_at: number; // timestamp
  updated_at: number; // timestamp
  is_follow: boolean;
  is_like: boolean;
  answer_count: number;
  comment_count: number;
  follow_count: number;
  like_count: number;
  view_count: number;
  is_group: boolean;
  group: GroupDto;
  has_bounty: boolean;
  bounty: number;
  is_solved: boolean;
  accepted_answer: AnswerDto;
}

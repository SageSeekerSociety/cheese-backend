import { AttitudeStateDto } from '../../attitude/DTO/attitude-state.dto';
import { GroupDto } from '../../groups/DTO/group.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class AnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  attitudes: AttitudeStateDto;
  is_favorite: boolean;
  comment_count: number;
  favorite_count: number;
  view_count: number;
  is_group: boolean;
  group?: GroupDto;
}

import { AttitudeStateDto } from '../../attitude/DTO/attitude-state.dto';
import { UserDto } from '../../users/DTO/user.dto';
import { CommentableType } from '../commentable.enum';

export class CommentDto {
  id: number;
  commentable_id: number;
  commentable_type: CommentableType;
  content: string;
  user: UserDto;
  created_at: number;
  attitudes: AttitudeStateDto;
}

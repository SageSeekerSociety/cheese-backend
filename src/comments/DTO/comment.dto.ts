import { CommentCommentabletypeEnum } from '@prisma/client';
import { AttitudeStateDto } from '../../attitude/DTO/attitude-state.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class CommentDto {
  id: number;
  commentable_id: number;
  commentable_type: CommentCommentabletypeEnum;
  content: string;
  user: UserDto;
  created_at: number;
  attitudes: AttitudeStateDto;
}

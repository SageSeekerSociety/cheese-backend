import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class CommentDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  quote: {
    quote_id: number | undefined;
    quote_user: UserDto | undefined;
  };
  content: string;
  user: UserDto;
  created_at: number;
  agree_type: number;
  agree_count: number;
  disagree_count: number;
}

export class CommentResponseDto extends BaseRespondDto {
  data: CommentDto;
}

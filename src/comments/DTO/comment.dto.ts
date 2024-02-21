import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { User } from '../../users/users.legacy.entity';
export class CommentDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  user: User;
  createdAt: number;
  agreeCount: number;
  disagreeCount: number;
  agreeType: '3' | '1' | '2';
}

export class CreateCommentResponseDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';
export class CommentDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  user: UserDto;
  createdAt: number;
  agreeCount: number;
  disagreeCount: number;
  agreeType: 'Indifferent' | 'Agreed' | 'Disagreed';
}

export class CreateCommentResponseDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

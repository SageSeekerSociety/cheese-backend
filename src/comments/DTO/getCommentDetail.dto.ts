import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { User } from '../../users/users.entity';
export class GetCommentDetailDto extends BaseRespondDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  user: User;
  created_at: number;
  agree_type: number;
  agree_count: number;
  disagree_count: number;
}

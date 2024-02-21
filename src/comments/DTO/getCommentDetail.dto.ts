import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { User } from '../../users/users.entity';
export class GetCommentDetailDto extends BaseRespondDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  user: User;
  createdAt: number;
  agreeCount: number;
  disagreeCount: number;
  agreeType:number;
}

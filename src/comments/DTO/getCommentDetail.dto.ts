import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
export class GetCommentDetailDto extends BaseRespondDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  createdAt: number;
  agreeCount: number;
  disagreeCount: number;
  agreeType: '3' | '1' | '2';
}

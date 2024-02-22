import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class GetCommentDetailDto {
  id: number;
  commentableId: number;
  commentableType: 'answer' | 'comment' | 'question';
  content: string;
  createdAt: number;
  agreeCount: number;
  disagreeCount: number;
  agreeType: 'Indifferent' | 'Agreed' | 'Disagreed';
}
export class GetCommentDetailResponseDto extends BaseRespondDto {
  data: GetCommentDetailDto;
}

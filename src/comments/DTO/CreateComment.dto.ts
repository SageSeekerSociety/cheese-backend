export class CreateCommentDto {
  content: string;
  authorId: number;
  agreeCount: number; // 添加这一行
}

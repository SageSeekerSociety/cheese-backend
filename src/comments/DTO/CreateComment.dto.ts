export class CreateCommentDto {
  content: string;
  answerId: number; // Update from authorId to answerId
  agreeCount: number;
  userId: number; // Add userId field
}

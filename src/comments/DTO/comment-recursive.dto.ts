import { CommentDto } from './comment.dto';

export class CommentRecursiveDto extends CommentDto {
  sub_comment_count: number;
  sub_comments: CommentRecursiveDto[];
}

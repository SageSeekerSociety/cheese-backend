import { CommentCommentabletypeEnum } from '@prisma/client';
import { InvalidCommentableTypeError } from './comment.error';

export function parseCommentable(
  commentable: string,
): CommentCommentabletypeEnum {
  commentable = commentable.toUpperCase();
  switch (commentable) {
    case 'ANSWER':
      return CommentCommentabletypeEnum.ANSWER;
    case 'COMMENT':
      return CommentCommentabletypeEnum.COMMENT;
    case 'QUESTION':
      return CommentCommentabletypeEnum.QUESTION;
    default:
      throw new InvalidCommentableTypeError(commentable);
  }
}

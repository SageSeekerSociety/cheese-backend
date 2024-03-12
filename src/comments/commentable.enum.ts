import { InvalidCommentableTypeError } from './comment.error';

export enum CommentableType {
  ANSWER = 'ANSWER',
  COMMENT = 'COMMENT',
  QUESTION = 'QUESTION',
}

export enum CommentTag {
  IGNORED = 'IGNORED',
  SOLVED = 'SOLVED',
}

export function parseCommentable(commentable: string): CommentableType {
  commentable = commentable.toUpperCase();
  switch (commentable) {
    case 'ANSWER':
      return CommentableType.ANSWER;
    case 'COMMENT':
      return CommentableType.COMMENT;
    case 'QUESTION':
      return CommentableType.QUESTION;
    default:
      throw new InvalidCommentableTypeError(commentable);
  }
}

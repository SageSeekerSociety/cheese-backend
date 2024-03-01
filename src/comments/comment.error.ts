import { BaseError } from '../common/error/base-error';
import { CommentableType } from './commentable.enum';

export class CommentableNotFoundError extends BaseError {
  constructor(
    public readonly commentableType: CommentableType,
    public readonly commentableId: number,
  ) {
    super(
      'CommentableIdNotFoundError',
      `${commentableType} ${commentableId} not found`,
      404,
    );
  }
}

export class InvalidCommentableTypeError extends BaseError {
  constructor(public readonly commentableType: string) {
    super(
      'InvalidCommentableTypeError',
      `Invalid commentable type: ${commentableType}`,
      400,
    );
  }
}

export class CommentNotFoundError extends BaseError {
  constructor(public readonly commentId: number) {
    super('CommentNotFoundError', `Comment ID ${commentId} not found`, 404);
  }
}

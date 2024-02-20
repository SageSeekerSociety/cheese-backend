import { BaseError } from '../common/error/base-error';

export class CommentableIdNotFoundError extends BaseError {
  constructor(public readonly commentableId: number) {
    super(
      'CommentableIdNotFoundError',
      `Commentable ID ${commentableId} not found`,
      404
    );
  }
}

export class InvalidAgreeTypeError extends BaseError {
  constructor(public readonly agreeType: number) {
    super(
      'InvalidAgreeTypeError',
      `Invalid agree type: ${agreeType}`,
      400
    );
  }
}

export class CommentNotFoundError extends BaseError {
  constructor(public readonly commentId: number) {
    super(
      'commentNotFoundError',
      `Comment ID ${commentId} not found`,
      404
    );
  }
}

export class CommentNotFoundByUserError extends BaseError {
  constructor(public readonly userId: number) {
    super(
      'commentNotFoundByUserError',
      `Comment ID not found by user ID: ${userId}`,
      404
    );
  }
}

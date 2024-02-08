import { BaseError } from '../common/error/base-error';

export class AnswerNotFoundError extends BaseError {
  constructor(id: number) {
    super(
      'AnswerNotFoundError',
      `Answer with id ${id} is not found.`,
      404,
    );
  }
}

export class AnswerAlreadyAgreeError extends BaseError {
  constructor(id: number) {
    super(
      'AnswerAlreadyAgreeError',
      `Answer with id ${id} is already favorited.`,
      400,
    );
  }
}
export class AnswerAlreadyFavoriteError extends BaseError {
  constructor(id: number) {
    super(
      'AnswerAlreadyFavoriteError',
      `Answer with id ${id} is already favorited.`,
      400,
    );
  }
}

import { BaseError } from '../common/error/base-error';

export class AnswerNotFoundError extends BaseError {
  constructor(public readonly id: number) {
    super(
      'AnswerNotFoundError',
     `Answer with id ${id} is not found.`, 
     404
     );
  }
}

export class AnswerAlreadyAgreeError extends BaseError {
  constructor(public readonly id: number) {
    super(
      'AnswerAlreadyAgreeError',
      `Answer with id ${id} is already agreed.`,
      400,
    );
  }
}

export class AnswerAlreadyFavoriteError extends BaseError {
  constructor(public readonly id: number) {
    super(
      'AnswerAlreadyFavoriteError',
      `Answer with id ${id} is already favorited.`,
      400,
    );
  }
}

export class AnswerAlreadyUnfavoriteError extends BaseError {
  constructor(public readonly id: number) {
    super(
      'AnswerAlreadyUnfavoriteError',
      `Answer with id ${id} is already unfavorited.`,
      400,
    );
  }
}
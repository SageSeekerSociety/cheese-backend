import { BaseError } from "../common/error/base-error";

export class QuestionNotFoundError extends BaseError {
  constructor(id: number) {
    super(
      'QuestionNotFoundError',
      `Question with id ${id} is not found.`,
      404,
    );
  }
}

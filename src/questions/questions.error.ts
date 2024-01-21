import { BaseError } from "../common/error/base-error";

export class QuestionIdNotFoundError extends BaseError {
  constructor(public readonly id: number) {
    super('QuestionIdNotFoundError', `Question id not found: ${id}`, 404);
  }
}
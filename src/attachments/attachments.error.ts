import { BaseError } from '../common/error/base-error';

export class InvalidAttachmentTypeError extends BaseError {
  constructor() {
    super('InvalidAttachmentTypeError', 'Invalid attachment type', 400);
  }
}

import { BaseError } from '../common/error/base-error';

export class InvalidAttachmentTypeError extends BaseError {
  constructor() {
    super('InvalidAttachmentTypeError', 'Invalid attachment type', 400);
  }
}
export class AttachmentNotFoundError extends BaseError {
  constructor(attachmentId: number) {
    super(
      'AttachmentNotFoundError',
      `Attachment ${attachmentId} Not Found`,
      404,
    );
  }
}

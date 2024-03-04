import { BaseError } from '../common/error/base-error';

export class AvatarNotFoundError extends BaseError {
  constructor(public readonly avatarid: number) {
    super('AvatarNotFoundError', `Avatar ${avatarid} Not Found`, 404);
  }
}

export class InvalidUserIdError extends BaseError {
  constructor() {
    super('InvalidUserIdError', 'Can Only Upload Your Own Avatar', 403);
  }
}

export class InvalidGroupIdError extends BaseError {
  constructor() {
    super('InvalidGroupIdError', ' Only Group Owner Can UploadAvatar', 403);
  }
}

export class InvalidOwnerTypeError extends BaseError {
  constructor() {
    super('InvalidOwnerTypeError', 'Type Must be User or Group', 404);
  }
}

import { BaseError } from '../common/error/base-error';

export class AvatarNotFoundError extends BaseError {
  constructor(public readonly avatarid: number) {
    super('AvatarNotFoundError', `Avatar ${avatarid} Not Found`, 404);
  }
}

export class CorrespondentFileNotExistError extends BaseError {
  constructor(public readonly avatarid: number) {
    super(
      'CorrespondentFileNotExistError',
      `File of Avatar ${avatarid} Not Found`,
      404,
    );
  }
}

export class InvalidAvatarTypeError extends BaseError {
  constructor(public readonly avatarType: string) {
    super('InvalidAvatarTypeError', `Invalid Avatar type: ${avatarType}`, 400);
  }
}

export class InvalidPathError extends BaseError {
  constructor() {
    super('InvalidPathError', `Invalid path`, 400);
  }
}

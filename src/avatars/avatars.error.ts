import { BaseError } from '../common/error/base-error';

export class AvatarNotFoundError extends BaseError {
  constructor(public readonly avatarId: number) {
    super('AvatarNotFoundError', `Avatar ${avatarId} Not Found`, 404);
  }
}

export class CorrespondentFileNotExistError extends BaseError {
  constructor(public readonly avatarId: number) {
    super(
      'CorrespondentFileNotExistError',
      `File of Avatar ${avatarId} Not Found`,
      404,
    );
  }
}

import { BaseError } from '../common/error/base-error';

export class AvatarNotFoundError extends BaseError {
  constructor(public readonly avatarid: number) {
    super('AvatarNotFoundError', `Avatar ${avatarid} Not Found`, 404);
  }
}

import { BaseError } from "../common/error/base-error";

export class InvalidGroupNameError extends BaseError {
  constructor(
    public readonly name: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidGroupNameError',
      `Invalid group name: ${name}. ${rule}`,
      422,
    );
  }
}

export class GroupNameAlreadyExistsError extends BaseError {
  constructor(public readonly name: string) {
    super(
      'GroupNameAlreadyExistsError',
      `Group name already exists: ${name}`,
      409,
    );
  }
}

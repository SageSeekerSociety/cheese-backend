/*
 *  Description: This file defines the errors related to groups service.
 *               All the errors should extend `BaseError`.
 *
 *  Author(s):
 *      Andy Lee    <andylizf@outlook.com>
 *
 */

import { BaseError } from '../common/error/base-error';

export class InvalidGroupNameError extends BaseError {
  constructor(
    public readonly groupName: string,
    public readonly rule: string,
  ) {
    super(
      'InvalidGroupNameError',
      `Invalid group name ${groupName} since ${rule}`,
      422,
    );
  }
}

export class GroupNameAlreadyUsedError extends BaseError {
  constructor(public readonly groupName: string) {
    super(
      'GroupNameAlreadyUsedError',
      `Group name ${groupName} already used`,
      409,
    );
  }
}

export class GroupIdNotFoundError extends BaseError {
  constructor(public readonly groupId: number) {
    super('GroupIdNotFoundError', `Group with id ${groupId} not found`, 404);
  }
}

export class CannotDeleteGroupError extends BaseError {
  constructor(public readonly groupId: number) {
    super('CannotDeleteGroupError', `Cannot delete group ${groupId}`, 403);
  }
}

export class GroupAlreadyJoinedError extends BaseError {
  constructor(public readonly groupId: number) {
    super('GroupAlreadyJoinedError', `Group ${groupId} already joined`, 409);
  }
}

export class GroupNotJoinedError extends BaseError {
  constructor(public readonly groupId: number) {
    super('GroupNotJoinedError', `Group ${groupId} not joined`, 409);
  }
}

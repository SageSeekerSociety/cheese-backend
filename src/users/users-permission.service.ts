import { Injectable } from '@nestjs/common';
import { Authorization, AuthorizedAction } from '../auth/auth.service';

@Injectable()
export class UsersPermissionService {
  // Although this method is not async now,
  // it may become async in the future.
  async getAuthorizationForUser(userId: number): Promise<Authorization> {
    return {
      userId: userId,
      permissions: [
        {
          authorizedActions: [AuthorizedAction.query],
          authorizedResource: {
            ownedByUser: userId,
            types: undefined,
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [AuthorizedAction.modify],
          authorizedResource: {
            ownedByUser: userId,
            types: ['users/profile'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [AuthorizedAction.create, AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: userId,
            types: ['users/following'],
            resourceIds: undefined,
          },
        },
        {
          // An user can control the questions he/she created.
          authorizedActions: [
            AuthorizedAction.create,
            AuthorizedAction.delete,
            AuthorizedAction.modify,
            AuthorizedAction.query,
            AuthorizedAction.other,
          ],
          authorizedResource: {
            ownedByUser: userId,
            types: ['questions'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [AuthorizedAction.create, AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: userId,
            types: ['questions/following'],
            resourceIds: undefined,
          },
        },
        {
          // Everyone can create a topic.
          authorizedActions: [AuthorizedAction.create],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['topics'],
            resourceIds: undefined,
          },
        },
        {
          // An user can create and delete comment.
          authorizedActions: [AuthorizedAction.create, AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: userId,
            types: ['comment'],
            resourceIds: undefined,
          },
        },
        {
          // An user can set attitude to any comment and question
          authorizedActions: [AuthorizedAction.other],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['comment/attitude', 'questions/attitude'],
            resourceIds: undefined,
          },
        },
      ],
    };
  }
}

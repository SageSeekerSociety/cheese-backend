import { Injectable } from '@nestjs/common';
import { Authorization, AuthorizedAction } from '../auth/definitions';

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
          authorizedActions: [AuthorizedAction.create, AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: userId,
            types: ['questions/invitation'],
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
          // An user can control the answer he/she created.
          authorizedActions: [
            AuthorizedAction.create,
            AuthorizedAction.delete,
            AuthorizedAction.modify,
            AuthorizedAction.query,
            AuthorizedAction.other,
          ],
          authorizedResource: {
            ownedByUser: userId,
            types: ['answer'],
            resourceIds: undefined,
          },
        },
        {
          // An user can set attitude to any answer
          authorizedActions: [AuthorizedAction.other],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['answer/attitude'],
            resourceIds: undefined,
          },
        },
        {
          // An user can favourite any answer
          authorizedActions: [AuthorizedAction.other],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['answer/favourite'],
            resourceIds: undefined,
          },
        },
        {
          // An user can create and delete comment.
          authorizedActions: [
            AuthorizedAction.create,
            AuthorizedAction.delete,
            AuthorizedAction.modify,
          ],
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
            types: [
              'comment/attitude',
              'questions/attitude',
              'answer/attitude',
            ],
            resourceIds: undefined,
          },
        },
        {
          // An user can upload material,attachment or materialbundle
          authorizedActions: [AuthorizedAction.create],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['material', 'attachment', 'materialbundle'],
            resourceIds: undefined,
          },
        },
      ],
    };
  }
}

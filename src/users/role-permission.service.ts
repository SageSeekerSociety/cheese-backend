import { Injectable } from '@nestjs/common';
import { Authorization } from '../auth/definitions';

@Injectable()
export class RolePermissionService {
  async getAuthorizationForUserWithRole(
    userId: number,
    roleName: string,
  ): Promise<Authorization> {
    switch (roleName) {
      case 'standard-user':
        return await this.getAuthorizationForStandardUser(userId);
      /* istanbul ignore next */
      default:
        throw new Error(`Role ${roleName} is not supported.`);
    }
  }

  private async getAuthorizationForStandardUser(
    userId: number,
  ): Promise<Authorization> {
    return {
      userId: userId,
      permissions: [
        {
          authorizedActions: [
            'query',
            'follow',
            'unfollow',
            'enumerate-followers',
            'enumerate-answers',
            'enumerate-questions',
            'enumerate-followed-users',
            'enumerate-followed-questions',
          ],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['user'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['modify-profile'],
          authorizedResource: {
            ownedByUser: userId,
            types: ['user'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['query', 'enumerate'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['question', 'answer', 'comment'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['create', 'delete', 'modify'],
          authorizedResource: {
            ownedByUser: userId,
            types: ['question', 'answer', 'comment'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [
            'query',
            'query-invitation-recommendations',
            'query-invitation',
            'enumerate',
            'enumerate-answers',
            'enumerate-followers',
            'enumerate-invitations',
            'follow',
            'unfollow',
            'invite',
            'uninvite',
          ],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['question'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['accept-answer', 'set-bounty'],
          authorizedResource: {
            ownedByUser: userId,
            types: ['question'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['query', 'favorite', 'unfavorite'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['answer'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['attitude'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['comment', 'question', 'answer'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['create', 'query'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['attachment', 'material'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['query', 'enumerate'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['material-bundle'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['create', 'modify', 'delete'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['material-bundle'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['create', 'query', 'enumerate'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['topic'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: ['create', 'enumerate'],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['avatar'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [],
          authorizedResource: {
            ownedByUser: undefined,
            types: ['group'],
            resourceIds: undefined,
          },
        },
        {
          authorizedActions: [],
          authorizedResource: {
            ownedByUser: userId,
            types: ['group'],
            resourceIds: undefined,
          },
        },
      ],
    };
  }
}

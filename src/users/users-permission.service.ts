import { Injectable, OnModuleInit } from '@nestjs/common';
import { Authorization, AuthorizedAction } from '../auth/definitions';
import { RolePermissionService } from './role-permission.service';
import { AuthService } from '../auth/auth.service';
import { PermissionDeniedError } from '../auth/auth.error';

@Injectable()
export class UsersPermissionService implements OnModuleInit {
  constructor(
    private readonly authService: AuthService,
    private readonly rolePermissionService: RolePermissionService,
  ) {}

  onModuleInit() {
    this.authService.customAuthLogics.register(
      'role-based',
      async (
        userId: number,
        action: AuthorizedAction,
        resourceOwnerId?: number,
        resourceType?: string,
        resourceId?: number,
        customLogicData?: any,
      ): Promise<boolean> => {
        const authorization =
          await this.rolePermissionService.getAuthorizationForUserWithRole(
            userId,
            customLogicData.role,
          );
        try {
          await this.authService.auditWithoutToken(
            authorization,
            action,
            resourceOwnerId,
            resourceType,
            resourceId,
          );
        } catch (e) {
          if (e instanceof PermissionDeniedError) {
            return false;
          }
          /* istanbul ignore next */
          throw e;
        }
        return true;
      },
    );
  }

  // Although this method is not async now,
  // it may become async in the future.
  async getAuthorizationForUser(userId: number): Promise<Authorization> {
    return {
      userId: userId,
      permissions: [
        {
          authorizedActions: undefined, // forward all actions
          authorizedResource: {}, // forward all resources
          customLogic: 'role-based',
          customLogicData: {
            role: 'standard-user',
          },
        },
      ],
    };
  }
}

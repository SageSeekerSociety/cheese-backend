import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PermissionDeniedError, TokenFormatError } from './auth.error';

export enum AuthorizedAction {
  fullControl = 0,
  create = 1,
  delete = 2,
  modify = 3,
  query = 4,
}

// This class is used as a filter.
//
// If all the conditions are null, it matches everything.
// This is DANGEROUS as you can imagine, and you should avoid
// such a powerful authorization.
//
// Once a condition is added, the audited resource should have the same
// attribute if it is authorized.
//
// The data field is reserved for future use.
//
// Examples:
// { ownedByUser: null, types: null, resourceId: null }
//      matches every resource, including the resources that are not owned by any user.
// { ownedByUser: 123, types: null, resourceId: null }
//      matches all the resources owned by user whose user id is 123.
// { ownedByUser: 123, types: ["password"], resourceId: null }
//      matches the password (as a resource) of user whose id is 123.
// { ownedByUser: null, types: ["blog"], resourceId: [42, 95, 928] }
//      matches blogs whose IDs are 42, 95 and 928.
// { ownedByUser: null, types: [], resourceId: null }
//      matches nothing and is meaningless.
//
export class AuthorizedResource {
  ownedByUser?: number; // owner's user id
  types?: string[]; // resource type
  resourceIds?: number[];
  data?: any; // additional data
}

// The permission to perform all the actions listed in authorizedActions
// on all the resources that match the authorizedResource property.
export class Permission {
  authorizedActions: AuthorizedAction[];
  authorizedResource: AuthorizedResource;
}

// The user, whose id is userId, is granted the permissions.
export class Authorization {
  userId: number; // authorization identity
  permissions: Permission[];
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // Sign a token for an authorization.
  sign(authorization: Authorization): string {
    return this.jwtService.sign(authorization, {});
  }

  // Verify a token and decodes its payload.
  //
  // If the token is invalid, for example, malformed, missigned or expired,
  // an exception will be thrown by jwtService.verify().
  //
  // If the token is valid but the payload is not an Authorization object,
  // TokenFormatError will be thrown.
  verify(token: string): Authorization {
    const result = this.jwtService.verify(token);
    if (result instanceof Authorization) {
      return result;
    } else {
      throw new TokenFormatError(token);
    }
  }

  // If the toke is invalid, or the operation is not permitted, an exception is thrown.
  //
  // If resourceOwnerId, resourceType or resourceId is null, it means the resource has
  // no owner, type or id. Only the AuthorizedResource object whose ownedByUser, types
  // or resourceIds is null or contains a null can matches such a resource which has
  // no owner, type or id.
  audit(
    token: string,
    action: AuthorizedAction,
    resourceOwnerId?: number,
    resourceType?: string,
    resourceId?: number,
  ): void {
    const authorization = this.verify(token);
    for (const permission of authorization.permissions) {
      var actionMatches = false;
      for (const authorizedAction of permission.authorizedActions) {
        if (authorizedAction === action) {
          actionMatches = true;
        }
      }
      if (actionMatches == false) continue;
      // Now, action matches.

      if (
        (permission.authorizedResource.ownedByUser === null ||
          permission.authorizedResource.ownedByUser === resourceOwnerId) !==
        true
      )
        continue;
      // Now, owner matches.

      var typeMatches =
        permission.authorizedResource.types === null ? true : false;
      if (permission.authorizedResource.types !== null) {
        for (const authorizedType of permission.authorizedResource.types) {
          if (authorizedType === resourceType) {
            typeMatches = true;
          }
        }
      }
      if (typeMatches == false) continue;
      // Now, type matches.

      var idMatches =
        permission.authorizedResource.resourceIds === null ? true : false;
      if (permission.authorizedResource.resourceIds !== null) {
        for (const authorizedId of permission.authorizedResource.resourceIds) {
          if (authorizedId === resourceId) {
            idMatches = true;
          }
        }
      }
      if (idMatches == false) continue;
      // Now, id matches.

      // Action, owner, type and id matches, so the operaton is permitted.
      return;
    }
    throw new PermissionDeniedError(
      action,
      resourceOwnerId,
      resourceType,
      resourceId,
    );
  }
}

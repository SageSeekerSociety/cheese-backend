/*

IMPORTANT NOTICE:

If you have modified this file, please run the following linux command:

./node_modules/.bin/ts-json-schema-generator \
  --path 'src/auth/definitions.ts'          \
  --type 'TokenPayload'                      \
  > src/auth/token-payload.schema.json

to update the schema file, which is used in validating the token payload.

*/

export enum AuthorizedAction {
  create = 1,
  delete = 2,
  modify = 3,
  query = 4,

  other = 5,
}

export function authorizedActionToString(action: AuthorizedAction): string {
  switch (action) {
    case AuthorizedAction.create:
      return 'create';
    case AuthorizedAction.delete:
      return 'delete';
    case AuthorizedAction.modify:
      return 'modify';
    case AuthorizedAction.query:
      return 'query';
    case AuthorizedAction.other:
      return 'other';
  }
}
// This class is used as a filter.
//
// If all the conditions are undefined, it matches everything.
// This is DANGEROUS as you can imagine, and you should avoid
// such a powerful authorization.
//
// Once a condition is added, the audited resource should have the same
// attribute if it is authorized.
//
// The data field is reserved for future use.
//
// Examples:
// { ownedByUser: undefined, types: undefined, resourceId: undefined }
//      matches every resource, including the resources that are not owned by any user.
// { ownedByUser: 123, types: undefined, resourceId: undefined }
//      matches all the resources owned by user whose user id is 123.
// { ownedByUser: 123, types: ["users/profile"], resourceId: undefined }
//      matches the profile of user whose id is 123.
// { ownedByUser: undefined, types: ["blog"], resourceId: [42, 95, 928] }
//      matches blogs whose IDs are 42, 95 and 928.
// { ownedByUser: undefined, types: [], resourceId: undefined }
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

export class TokenPayload {
  authorization: Authorization;
  signedAt: number; // timestamp in milliseconds
  validUntil: number; // timestamp in milliseconds
}

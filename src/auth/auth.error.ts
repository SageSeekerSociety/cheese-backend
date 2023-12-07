import { BaseError } from '../common/error/base-error';
import { AuthorizedAction } from './auth.service';

export class TokenFormatError extends BaseError {
  constructor(public readonly token: string) {
    super(
      'TokenFormatError',
      `The token is valid, but AuthService could not understand its payload. Token: ${token}`,
      401,
    );
  }
}

export class PermissionDeniedError extends BaseError {
  constructor(
    public readonly action: AuthorizedAction,
    public readonly resourceOwnerId?: number,
    public readonly resourceType?: string,
    public readonly resourceId?: number,
  ) {
    super(
      'PermissionDeniedError',
      `The attempt to perform action '${action}' on resource (resourceOwnerId: ${resourceOwnerId === null ? 'null' : resourceOwnerId}, resourceType: ${resourceType === null ? 'null' : resourceType}, resourceId: ${resourceId === null ? 'null' : resourceId}) is not permitted by the given token.`,
      403,
    );
  }
}

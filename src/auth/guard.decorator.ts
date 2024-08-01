import { AuthenticationRequiredError } from './auth.error';
import { AuthService } from './auth.service';
import { AuthorizedAction } from './definitions';

const RESOURCE_ID_METADATA_KEY = Symbol('resourceIdMetadata');
const AUTH_TOKEN_METADATA_KEY = Symbol('authTokenMetadata');
const RESOURCE_OWNER_ID_GETTER_METADATA_KEY = Symbol(
  'resourceOwnerIdGetterMetadata',
);
const CURRENT_USER_OWN_RESOURCE_METADATA_KEY = Symbol(
  'currentUserOwnResourceMetadata',
);

export function ResourceId() {
  return function (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) {
    Reflect.defineMetadata(
      RESOURCE_ID_METADATA_KEY,
      parameterIndex,
      target,
      propertyKey,
    );
  };
}

export function AuthToken() {
  return function (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) {
    Reflect.defineMetadata(
      AUTH_TOKEN_METADATA_KEY,
      parameterIndex,
      target,
      propertyKey,
    );
  };
}

// apply it only to (resourceId: number) => Promise<number | undefined>
export function ResourceOwnerIdGetter(resourceType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      RESOURCE_OWNER_ID_GETTER_METADATA_KEY,
      resourceType,
      target,
      propertyKey,
    );
  };
}

export function CurrentUserOwnResource() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      CURRENT_USER_OWN_RESOURCE_METADATA_KEY,
      true,
      target,
      propertyKey,
    );
  };
}

export function Guard(action: AuthorizedAction, resourceType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const authTokenParamIdx: number | undefined = Reflect.getOwnMetadata(
        AUTH_TOKEN_METADATA_KEY,
        target,
        propertyKey,
      );
      const authToken =
        authTokenParamIdx != undefined ? args[authTokenParamIdx] : undefined;
      if (authToken == undefined) {
        throw new AuthenticationRequiredError();
      }

      const resourceIdParamIdx: number | undefined = Reflect.getOwnMetadata(
        RESOURCE_ID_METADATA_KEY,
        target,
        propertyKey,
      );
      const resourceId =
        resourceIdParamIdx != undefined ? args[resourceIdParamIdx] : undefined;

      let resourceOwnerId: number | undefined = undefined;
      const currentUserOwnResource: true | undefined = Reflect.getMetadata(
        CURRENT_USER_OWN_RESOURCE_METADATA_KEY,
        target,
        propertyKey,
      );
      if (currentUserOwnResource != undefined) {
        resourceOwnerId = AuthService.instance.verify(authToken).userId;
      } else {
        const methods = Object.getOwnPropertyNames(target).filter(
          (prop) => typeof target[prop] === 'function',
        );
        let ownerIdGetterName: string | undefined = undefined;
        for (const method of methods) {
          const metadata = Reflect.getMetadata(
            RESOURCE_OWNER_ID_GETTER_METADATA_KEY,
            target,
            method,
          );
          if (metadata === resourceType) {
            ownerIdGetterName = method;
          }
        }
        const resourceOwnerIdGetter =
          ownerIdGetterName != undefined
            ? target[ownerIdGetterName]
            : undefined;
        resourceOwnerId =
          resourceId != undefined && resourceOwnerIdGetter != undefined
            ? await resourceOwnerIdGetter.call(this, resourceId)
            : undefined;
      }

      AuthService.instance.audit(
        authToken,
        action,
        resourceOwnerId,
        resourceType,
        resourceId,
      );
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

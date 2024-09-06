import { AuthorizedAction } from './definitions';

export type CustomAuthLogicHandler = (
  action: AuthorizedAction,
  resourceOwnerId?: number,
  resourceType?: string,
  resourceId?: number,
  customLogicData?: any,
) => Promise<boolean>;

export class CustomAuthLogics {
  private logics: Map<string, CustomAuthLogicHandler> = new Map();

  register(name: string, handler: CustomAuthLogicHandler): void {
    this.logics.set(name, handler);
  }

  invoke(
    name: string,
    action: AuthorizedAction,
    resourceOwnerId?: number,
    resourceType?: string,
    resourceId?: number,
    customLogicData?: any,
  ): Promise<boolean> {
    const handler = this.logics.get(name);
    if (!handler) {
      throw new Error(`Custom auth logic '${name}' not found.`);
    }
    return handler(
      action,
      resourceOwnerId,
      resourceType,
      resourceId,
      customLogicData,
    );
  }
}

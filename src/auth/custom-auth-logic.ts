import { AuthorizedAction } from './definitions';

export type CustomAuthLogicHandler = (
  userId: number,
  action: AuthorizedAction,
  resourceOwnerId?: number,
  resourceType?: string,
  resourceId?: number,
  customLogicData?: any,
) => Promise<boolean>;

export class CustomAuthLogics {
  private logics: Map<string, CustomAuthLogicHandler> = new Map();

  register(name: string, handler: CustomAuthLogicHandler): void {
    /* istanbul ignore if */
    if (this.logics.has(name)) {
      throw new Error(`Custom auth logic '${name}' already exists.`);
    }
    this.logics.set(name, handler);
  }

  invoke(
    name: string,
    userId: number,
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
      userId,
      action,
      resourceOwnerId,
      resourceType,
      resourceId,
      customLogicData,
    );
  }
}

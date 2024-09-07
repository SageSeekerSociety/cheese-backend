/*
 *  Description: An interceptor that will ensure the presence of a guard or NoAuth decorator.
 *               This interceptor is used globally to avoid forgetting to add a guard.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { NoAuth } from './token-validate.interceptor';
import { HAS_GUARD_DECORATOR_METADATA_KEY } from '../../auth/guard.decorator';

// See: https://docs.nestjs.com/interceptors
// See: https://stackoverflow.com/questions/63618612/nestjs-use-service-inside-interceptor-not-global-interceptor

@Injectable()
export class EnsureGuardInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const noAuth = this.reflector.get(NoAuth, context.getHandler());
    const hasGuard =
      this.reflector.get(
        HAS_GUARD_DECORATOR_METADATA_KEY,
        context.getHandler(),
      ) ?? false;
    /* istanbul ignore if */
    if (!hasGuard && !noAuth) {
      throw new Error(
        'EnsureGuardInterceptor: Neither Guard nor NoAuth decorator found',
      );
    }
    return next.handle();
  }
}

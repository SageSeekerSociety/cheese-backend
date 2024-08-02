/*
 *  Description: An interceptor that will validate access token as long as there is one.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

/*
 *  Use this interceptor in all controllers to validate the token. This is due to a need of the front-end:
 *
 *  "Some endpoints can still be accessed without a login, but their response is related to the currently logged in user.
 *  In this case it should always be verified that the token carried by the request has not expired." -- HuanCheng65@Github
 *
 *  If the back-end don't do so, then the front-end will get no error and a respond same as the one user will get with out logging in.
 *  Our solution is to always validate access token as long as there is one in the http header.
 *
 *  See: https://github.com/SageSeekerSociety/cheese-backend/issues/85
 *
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

// See: https://docs.nestjs.com/interceptors
// See: https://stackoverflow.com/questions/63618612/nestjs-use-service-inside-interceptor-not-global-interceptor

export const NoAuth = Reflector.createDecorator();

@Injectable()
export class TokenValidateInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const noAuth = this.reflector.get(NoAuth, context.getHandler());
    if (noAuth) {
      return next.handle();
    }
    const token = context.switchToHttp().getRequest().headers['authorization'];
    if (token != undefined) {
      AuthService.instance.verify(token);
    }
    return next.handle();
  }
}

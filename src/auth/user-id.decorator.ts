/*
 *  Description: This file implements a decorator that can be used to get the user id.
 *               It can be used just like the @Ip() decorator.
 *
 *               It has two forms:
 *                  1. @UserId() userId: number | undefined
 *                  2. @UserId(true) userId: number
 *               Only the second one will throw an error if the user is not logged in.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticationRequiredError } from './auth.error';

export const UserId = createParamDecorator(
  (required: boolean = false, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.headers.authorization;
    let userId: number | undefined = undefined;
    if (required) {
      userId = AuthService.instance.verify(auth).userId;
      /* istanbul ignore if */
      if (userId == undefined) {
        throw new AuthenticationRequiredError();
      }
    } else {
      try {
        userId = AuthService.instance.verify(auth).userId;
      } catch {
        // The user is not logged in.
      }
    }
    return userId;
  },
);

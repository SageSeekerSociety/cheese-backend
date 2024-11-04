import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class XForwardedForMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
      req.connection.remoteAddress;
    Object.defineProperty(req, 'ip', {
      value: ip,
      writable: false,
      configurable: false,
    });
    next();
  }
}

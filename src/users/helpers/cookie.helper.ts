/*
 *  Description: This file implements cookie helper utilities.
 *               It provides reusable methods for consistent cookie handling.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

export class CookieHelper {
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Set refresh token cookie with consistent options
   */
  setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    expires: Date,
  ): Response {
    const cookieBasePath = this.configService.get('cookieBasePath') || '';

    return res.cookie('REFRESH_TOKEN', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: path.posix.join(cookieBasePath, 'users/auth'),
      expires,
    });
  }

  /**
   * Clear refresh token cookie with consistent options
   */
  clearRefreshTokenCookie(res: Response): Response {
    const cookieBasePath = this.configService.get('cookieBasePath') || '';

    return res.clearCookie('REFRESH_TOKEN', {
      path: path.posix.join(cookieBasePath, 'users/auth'),
    });
  }

  /**
   * Get refresh token from request cookies
   * Uses cookie-parser middleware for consistent parsing
   */
  static getRefreshToken(req: any): string | undefined {
    return req.cookies?.REFRESH_TOKEN;
  }

  /**
   * Set OAuth redirect cookie for cross-domain OAuth flows
   */
  setOAuthRedirectCookie(
    res: Response,
    redirectUrl: string,
    expires?: Date,
  ): Response {
    const cookieBasePath = this.configService.get('cookieBasePath') || '';

    return res.cookie('OAUTH_REDIRECT', redirectUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // OAuth requires lax for cross-domain redirects
      path: path.posix.join(cookieBasePath, 'auth/oauth'),
      expires: expires || new Date(Date.now() + 10 * 60 * 1000), // 10 minutes default
    });
  }

  /**
   * Clear OAuth redirect cookie
   */
  clearOAuthRedirectCookie(res: Response): Response {
    const cookieBasePath = this.configService.get('cookieBasePath') || '';

    return res.clearCookie('OAUTH_REDIRECT', {
      path: path.posix.join(cookieBasePath, 'auth/oauth'),
    });
  }
}

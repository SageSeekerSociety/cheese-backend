/*
 *  Description: This file implements the session service.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  NotRefreshTokenError,
  RefreshTokenAlreadyUsedError,
  SessionExpiredError,
  SessionRevokedError,
} from './auth.error';
import { AuthService } from './auth.service';
import { Authorization } from './definitions';

@Injectable()
export class SessionService {
  constructor(
    private readonly authService: AuthService,
    private readonly prismaService: PrismaService,
  ) {}

  private readonly defaultSessionValidSeconds = 60 * 60 * 24 * 30 * 12;
  private readonly defaultRefreshTokenValidSeconds = 60 * 60 * 24 * 30;
  private readonly defaultAccessTokenValidSeconds = 15 * 60;

  private getRefreshAuthorization(
    userId: number,
    sessionId: number,
  ): Authorization {
    return {
      userId: userId,
      permissions: [
        {
          authorizedResource: {
            ownedByUser: undefined,
            types: ['auth/session:refresh', 'auth/session:revoke'],
            resourceIds: [sessionId],
          },
          authorizedActions: ['other'],
        },
      ],
    };
  }

  // Returns:
  //     The refresh token of the session.
  async createSession(
    userId: number,
    authorization: Authorization,
    // The refresh token is valid for refreshTokenValidSeconds seconds.
    // By default, it is valid for defaultRefreshTokenValidSeconds seconds.
    refreshTokenValidSeconds: number = this.defaultRefreshTokenValidSeconds,
    sessionValidSeconds: number = this.defaultSessionValidSeconds,
  ): Promise<string> {
    const session = await this.prismaService.session.create({
      data: {
        userId: userId,
        authorization: JSON.stringify(authorization),
        validUntil: new Date(Date.now() + sessionValidSeconds * 1000),
        revoked: false,
        lastRefreshedAt: new Date().getTime(),
      },
    });
    return this.authService.sign(
      this.getRefreshAuthorization(userId, session.id),
      refreshTokenValidSeconds,
    );
  }

  // After refreshing the session, the old refresh token is revoked.
  // Returns:
  //     item1: A new refresh token.
  //     item2: The access token of the session.
  async refreshSession(
    oldRefreshToken: string,
    refreshTokenValidSeconds: number = this.defaultRefreshTokenValidSeconds,
    accessTokenValidSeconds: number = this.defaultAccessTokenValidSeconds,
  ): Promise<[string, string]> {
    const auth = this.authService.verify(oldRefreshToken);
    if (
      auth.permissions.length !== 1 ||
      auth.permissions[0].authorizedResource.resourceIds == undefined ||
      auth.permissions[0].authorizedResource.resourceIds.length !== 1
    ) {
      throw new NotRefreshTokenError();
    }
    const sessionId = auth.permissions[0].authorizedResource.resourceIds[0];
    await this.authService.audit(
      oldRefreshToken,
      'other',
      undefined,
      'auth/session:refresh',
      sessionId,
    );
    let session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
    });
    /* istanbul ignore if */
    if (session == undefined) {
      throw new Error(
        `In an attempt to refresh session with id ${sessionId},\n` +
          `the refresh token is valid, but the session does not exist.\n` +
          `Here are three possible reasons:\n` +
          `1. There is a bug in the code.\n` +
          `2. The database is corrupted.\n` +
          `3. We are under attack.\n` +
          `token: ${oldRefreshToken}`,
      );
    }
    if (new Date() > session.validUntil) {
      throw new SessionExpiredError();
    }
    if (session.revoked) {
      throw new SessionRevokedError();
    }
    const oldRefreshTokenSignedAt =
      this.authService.decode(oldRefreshToken).signedAt;
    if (oldRefreshTokenSignedAt < session.lastRefreshedAt) {
      throw new RefreshTokenAlreadyUsedError();
    }
    const authorization = JSON.parse(session.authorization) as Authorization;
    const refreshAuthorization = this.getRefreshAuthorization(
      session.userId,
      session.id,
    );

    // get the current time before signing to ensure
    // sign time of a refreshToken >= lastRefreshedAt
    const lastRefreshedAt = new Date().getTime();
    const newRefreshToken = this.authService.sign(
      refreshAuthorization,
      refreshTokenValidSeconds,
    );
    const accessToken = this.authService.sign(
      authorization,
      accessTokenValidSeconds,
    );

    // Update lastRefreshedAt
    session = await this.prismaService.session.update({
      where: { id: sessionId },
      data: { lastRefreshedAt: lastRefreshedAt },
    });

    // Insert a log
    await this.prismaService.sessionRefreshLog.create({
      data: {
        sessionId: session.id,
        oldRefreshToken: oldRefreshToken,
        newRefreshToken: newRefreshToken,
        accessToken: accessToken,
      },
    });

    return [newRefreshToken, accessToken];
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const auth = this.authService.verify(refreshToken);
    if (
      auth.permissions.length !== 1 ||
      auth.permissions[0].authorizedResource.resourceIds == undefined ||
      auth.permissions[0].authorizedResource.resourceIds.length !== 1
    ) {
      throw new NotRefreshTokenError();
    }
    const sessionId = auth.permissions[0].authorizedResource.resourceIds[0];
    await this.authService.audit(
      refreshToken,
      'other',
      undefined,
      'auth/session:revoke',
      sessionId,
    );
    const ret = await this.prismaService.session.update({
      where: { id: sessionId },
      data: { revoked: true },
    });
    /* istanbul ignore if */
    if (ret == undefined) {
      throw new Error(
        `In an attempt to revoke session with id ${sessionId},\n` +
          `the refresh token is valid, but the session does not exist.\n` +
          `Here are three possible reasons:\n` +
          `1. There is a bug in the code.\n` +
          `2. The database is corrupted.\n` +
          `3. We are under attack.\n` +
          `token: ${refreshToken}`,
      );
    }
  }
}

/*
 *  Description: This file implements the session service.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotRefreshTokenError,
  RefreshTokenAlreadyUsedError,
  SessionExpiredError,
  SessionRevokedError,
} from './auth.error';
import { AuthService, Authorization, AuthorizedAction } from './auth.service';
import { Session, SessionRefreshLog } from './session.legacy.entity';

@Injectable()
export class SessionService {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionRefreshLog)
    private readonly sessionRefreshLogRepository: Repository<SessionRefreshLog>,
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
          authorizedActions: [AuthorizedAction.other],
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
    const session = new Session();
    session.userId = userId;
    session.authorization = JSON.stringify(authorization);
    session.validUntil = new Date(Date.now() + sessionValidSeconds * 1000);
    session.revoked = false;
    session.lastRefreshedAt = new Date().getTime();
    await this.sessionRepository.save(session);
    return this.authService.sign(
      this.getRefreshAuthorization(userId, session.id),
      refreshTokenValidSeconds,
    );
  }

  private async getSessionIdByRefreshToken(
    refreshToken: string,
  ): Promise<number> {
    const auth = this.authService.verify(refreshToken);
    const permissions = auth.permissions;
    if (permissions[0] == null || permissions.length > 1) {
      throw new NotRefreshTokenError();
    }
    const resouceIds = permissions[0].authorizedResource.resourceIds;
    if (resouceIds == null || resouceIds[0] == null || resouceIds.length > 1) {
      throw new NotRefreshTokenError();
    }
    return resouceIds[0];
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
    const sessionId = await this.getSessionIdByRefreshToken(oldRefreshToken);
    this.authService.audit(
      oldRefreshToken,
      AuthorizedAction.other,
      undefined,
      'auth/session:refresh',
      sessionId,
    );
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
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
    session.lastRefreshedAt = lastRefreshedAt;
    await this.sessionRepository.save(session);

    // Insert a log
    const log = new SessionRefreshLog();
    log.sessionId = session.id;
    log.oldRefreshToken = oldRefreshToken;
    log.newRefreshToken = newRefreshToken;
    log.accessToken = accessToken;
    await this.sessionRefreshLogRepository.save(log);

    return [newRefreshToken, accessToken];
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const sessionId = await this.getSessionIdByRefreshToken(refreshToken);
    this.authService.audit(
      refreshToken,
      AuthorizedAction.other,
      undefined,
      'auth/session:revoke',
      sessionId,
    );
    const ret = await this.sessionRepository.update(
      { id: sessionId },
      { revoked: true },
    );
    /* istanbul ignore if */
    if (ret.affected !== 1) {
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

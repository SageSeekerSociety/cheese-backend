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
import { SessionExpiredError, SessionRevokedError } from './auth.error';
import { AuthService, Authorization, AuthorizedAction } from './auth.service';
import { Session, SessionRefreshLog } from './session.entity';

@Injectable()
export class SessionService {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionRefreshLog)
    private readonly sessionRefreshLogRepository: Repository<SessionRefreshLog>,
  ) {}

  // Returns:
  //     The refresh token of the session.
  async createSession(
    userId: number,
    authorization: Authorization,
    // The session is valid for validSeconds seconds.
    // By default, it is valid for 30 days.
    validSeconds: number = 60 * 60 * 24 * 30,
  ): Promise<string> {
    const session = new Session();
    session.userId = userId;
    session.authorization = JSON.stringify(authorization);
    session.validUntil = new Date(Date.now() + validSeconds * 1000);
    session.revoked = false;
    await this.sessionRepository.save(session);
    return this.authService.sign(
      {
        userId: userId,
        permissions: [
          {
            authorizedResource: {
              ownedByUser: null,
              types: ['auth/session:refresh', 'auth/session:revoke'],
              resourceIds: [session.id],
            },
            authorizedActions: [AuthorizedAction.other],
          },
        ],
      },
      validSeconds,
    );
  }

  // Returns:
  //     The access token of the session.
  async refreshSession(refreshToken: string): Promise<string> {
    const auth = this.authService.verify(refreshToken);
    const sessionId = auth.permissions[0].authorizedResource.resourceIds[0];
    this.authService.audit(
      refreshToken,
      AuthorizedAction.other,
      null,
      'auth/session:refresh',
      sessionId,
    );
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (new Date() > session.validUntil) {
      throw new SessionExpiredError();
    }
    if (session.revoked) {
      throw new SessionRevokedError();
    }
    const authorization = JSON.parse(session.authorization) as Authorization;
    const accessToken = this.authService.sign(authorization, 60);

    // Update lastRefreshedAt
    session.lastRefreshedAt = new Date();
    await this.sessionRepository.save(session);

    // Insert a log
    const log = new SessionRefreshLog();
    log.sessionId = session.id;
    log.refreshToken = refreshToken;
    log.accessToken = accessToken;
    await this.sessionRefreshLogRepository.save(log);

    return accessToken;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const auth = this.authService.verify(refreshToken);
    const sessionId = auth.permissions[0].authorizedResource.resourceIds[0];
    this.authService.audit(
      refreshToken,
      AuthorizedAction.other,
      null,
      'auth/session:revoke',
      sessionId,
    );
    await this.sessionRepository.update({ id: sessionId }, { revoked: true });
  }
}

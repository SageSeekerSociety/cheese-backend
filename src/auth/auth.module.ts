/*
 *  Description: This file defines the auth module, which is used for
 *               authentication and authorization.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_SECRET } from '../../.secret/jwt.config';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session, SessionRefreshLog } from './session.entity';
import { SessionService } from './session.service';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      // This expire date is meaningless, as we use
      // a field in token payload to determine whether
      // the token is expired. Thus, we set it to a
      // very large value.
      signOptions: { expiresIn: '361 days' },
    }),
    TypeOrmModule.forFeature([Session, SessionRefreshLog]),
  ],
  controllers: [],
  providers: [AuthService, SessionService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}

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
import { JWT_EXPIRES_IN, JWT_SECRET } from '../../.secret/jwt.config';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

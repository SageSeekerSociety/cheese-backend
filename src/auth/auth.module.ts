/*
 *  Description: This file defines the auth module, which is used for
 *               authentication and authorization.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        // This expire date is meaningless, as we use
        // a field in token payload to determine whether
        // the token is expired. Thus, we set it to a
        // very large value.
        signOptions: { expiresIn: '361 days' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [AuthService, SessionService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}

/*
 *  Description: This file defines the users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from './email.service';
import { UsersController } from './users.controller';
import {
  User,
  UserFollowingRelationship,
  UserLoginLog,
  UserProfile,
  UserProfileQueryLog,
  UserRegisterLog,
  UserRegisterRequest,
  UserResetPasswordLog,
} from './users.legacy.entity';
import { UsersService } from './users.service';
import { AvatarsModule } from '../avatars/avatars.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserFollowingRelationship,
      UserRegisterRequest,
      UserLoginLog,
      UserProfileQueryLog,
      UserRegisterLog,
      UserResetPasswordLog,
    ]),
    AuthModule,
    AvatarsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, EmailService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}

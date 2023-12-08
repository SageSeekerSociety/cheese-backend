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
} from './users.entity';
import { UsersService } from './users.service';

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
  ],
  controllers: [UsersController],
  providers: [UsersService, EmailService],
})
export class UsersModule {}

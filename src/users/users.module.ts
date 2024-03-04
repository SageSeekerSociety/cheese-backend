/*
 *  Description: This file defines the users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from '../answer/answer.entity';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { Question } from '../questions/questions.legacy.entity';
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
import { Avatar } from '../avatars/avatars.legacy.entity';

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
      Question,
      Answer,
      Avatar,
    ]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, EmailService],
  exports: [UsersService],
})
export class UsersModule {}

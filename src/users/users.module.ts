/*
 *  Description: This file defines the users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerModule } from '../answer/answer.module';
import { AuthModule } from '../auth/auth.module';
import { AvatarsModule } from '../avatars/avatars.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersPermissionService } from './users-permission.service';
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
    PrismaModule,
    EmailModule,
    AuthModule,
    AvatarsModule,
    forwardRef(() => AnswerModule),
    forwardRef(() => QuestionsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersPermissionService],
  exports: [UsersService],
})
export class UsersModule {}

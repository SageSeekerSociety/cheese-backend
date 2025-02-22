/*
 *  Description: This file defines the users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnswerModule } from '../answer/answer.module';
import { AuthModule } from '../auth/auth.module';
import { AvatarsModule } from '../avatars/avatars.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { QuestionsModule } from '../questions/questions.module';
import { RolePermissionService } from './role-permission.service';
import { SrpService } from './srp.service';
import { TOTPService } from './totp.service';
import { UserChallengeRepository } from './user-challenge.repository';
import { UsersPermissionService } from './users-permission.service';
import { UsersRegisterRequestService } from './users-register-request.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EmailModule,
    AuthModule,
    AvatarsModule,
    forwardRef(() => AnswerModule),
    forwardRef(() => QuestionsModule),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersPermissionService,
    UsersRegisterRequestService,
    RolePermissionService,
    UserChallengeRepository,
    TOTPService,
    SrpService,
  ],
  exports: [UsersService],
})
export class UsersModule {}

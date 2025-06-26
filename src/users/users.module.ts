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
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AccountController } from './account/account.controller';
import { AccountService } from './account/account.service';
import { SecurityController } from './security/security.controller';
import { SecurityService } from './security/security.service';
import { RelationshipsController } from './relationships/relationships.controller';
import { RelationshipsService } from './relationships/relationships.service';
import { ContentController } from './content/content.controller';
import { ContentService } from './content/content.service';
// UsersController is being removed
import { UsersService } from './users.service'; // Original UsersService, still needed by sub-services

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
  controllers: [
    // UsersController, // Removed
    AuthController,
    AccountController,
    SecurityController,
    RelationshipsController,
    ContentController,
  ],
  providers: [
    // UsersService,        // Original UsersService is now empty and will be removed
    AuthService,
    AccountService,
    SecurityService,
    RelationshipsService,
    ContentService,
    UsersPermissionService,
    UsersRegisterRequestService,
    RolePermissionService,
    UserChallengeRepository,
    TOTPService,
    SrpService,
  ],
  exports: [
    // UsersService, // No longer exporting the original UsersService
    AuthService,
    AccountService,
    SecurityService,
    RelationshipsService,
    ContentService,
],
})
export class UsersModule {}

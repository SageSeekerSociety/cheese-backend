/*
 *  Description: This file defines the users module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { AnswerModule } from '../answer/answer.module';
import { AuthModule } from '../auth/auth.module';
import { AvatarsModule } from '../avatars/avatars.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { QuestionsModule } from '../questions/questions.module';
import { UsersPermissionService } from './users-permission.service';
import { UsersRegisterRequestService } from './users-register-request.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolePermissionService } from './role-permission.service';

@Module({
  imports: [
    PrismaModule,
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
  ],
  exports: [UsersService],
})
export class UsersModule {}

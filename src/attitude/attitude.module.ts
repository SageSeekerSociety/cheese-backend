/*
 *  Description: This file defines the attitude module.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AttitudeService } from './attitude.service';

@Module({
  imports: [PrismaModule, forwardRef(() => UsersModule)],
  providers: [AttitudeService],
  exports: [AttitudeService],
})
export class AttitudeModule {}

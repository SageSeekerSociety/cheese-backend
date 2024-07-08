/*
 *  Description: This file defines PrismaModule, the NestJs module that provides PrismaService.
 *               PrismaService provided by this module supports soft delete.
 *
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

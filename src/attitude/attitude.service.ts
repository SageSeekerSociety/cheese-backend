/*
 *  Description: This file implements the AttitudeService class.
 *               It is responsible for the business logic of attitude.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import { AttitudableType, AttitudeType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UserIdNotFoundError } from '../users/users.error';

@Injectable()
export class AttitudeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async setAttitude(
    userId: number,
    attitudableType: AttitudableType,
    attitudableId: number,
    attitude: AttitudeType,
  ): Promise<void> {
    if ((await this.usersService.isUserExists(userId)) == false) {
      throw new UserIdNotFoundError(userId);
    }
    await this.prismaService.attitudeLog.create({
      data: {
        userId,
        attitudableType,
        attitudableId,
        attitude,
      },
    });
    const old = await this.prismaService.attitude.findUnique({
      where: {
        attitudableId_userId_attitudableType: {
          userId,
          attitudableType,
          attitudableId,
        },
      },
    });
    if (old != null && old.attitude != attitude) {
      await this.prismaService.attitude.delete({
        where: { id: old.id },
      });
    }
    if (
      (old == null || old.attitude != attitude) &&
      attitude != AttitudeType.UNDEFINED
    ) {
      await this.prismaService.attitude.create({
        data: {
          userId,
          attitudableType,
          attitudableId,
          attitude,
        },
      });
    }
  }

  async getAttitude(
    userId: number,
    attitudableType: AttitudableType,
    attitudableId: number,
  ): Promise<AttitudeType> {
    const attitude = await this.prismaService.attitude.findUnique({
      where: {
        attitudableId_userId_attitudableType: {
          userId,
          attitudableType,
          attitudableId,
        },
      },
    });
    return attitude?.attitude ?? AttitudeType.UNDEFINED;
  }

  async countAttitude(
    attitudableType: AttitudableType,
    attitudableId: number,
    attitude: AttitudeType,
  ): Promise<number> {
    return await this.prismaService.attitude.count({
      where: {
        attitudableType,
        attitudableId,
        attitude,
      },
    });
  }
}

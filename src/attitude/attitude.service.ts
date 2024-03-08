/*
 *  Description: This file implements the AttitudeService class.
 *               It is responsible for the business logic of attitude.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable } from '@nestjs/common';
import {
  AttitudableType,
  AttitudeType,
  AttitudeTypeNotUndefined,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserIdNotFoundError } from '../users/users.error';
import { UsersService } from '../users/users.service';
import { AttitudeStateDto } from './attitude-state-dto.dto';

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
    if (attitude != AttitudeType.UNDEFINED) {
      await this.prismaService.attitude.upsert({
        where: {
          attitudableId_userId_attitudableType: {
            userId,
            attitudableType,
            attitudableId,
          },
        },
        update: {
          attitude,
        },
        create: {
          userId,
          attitudableType,
          attitudableId,
          attitude,
        },
      });
    } else {
      await this.prismaService.attitude.delete({
        where: {
          attitudableId_userId_attitudableType: {
            userId,
            attitudableType,
            attitudableId,
          },
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
    attitude: AttitudeTypeNotUndefined,
  ): Promise<number> {
    return await this.prismaService.attitude.count({
      where: {
        attitudableType,
        attitudableId,
        attitude,
      },
    });
  }

  async getAttitudeStatusDto(
    attitudableType: AttitudableType,
    attitudableId: number,
    userId?: number | undefined,
  ): Promise<AttitudeStateDto> {
    const positiveCount = await this.countAttitude(
      attitudableType,
      attitudableId,
      AttitudeType.POSITIVE,
    );
    const negativeCount = await this.countAttitude(
      attitudableType,
      attitudableId,
      AttitudeType.NEGATIVE,
    );
    const userAttitude =
      userId == null
        ? AttitudeType.UNDEFINED
        : await this.getAttitude(userId, attitudableType, attitudableId);
    return new AttitudeStateDto(positiveCount, negativeCount, userAttitude);
  }
}

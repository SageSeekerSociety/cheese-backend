/*
 *  Description: This file implements the UsersRegisterRequestService class.
 *               It is responsible for managing user register requests.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

//  We plan to use redis or something else to store verification codes
//  instead of storing them in database.
//
//  This change is planed to be implemented in the future.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersRegisterRequestService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly registerCodeValidSeconds = 10 * 60; // 10 minutes

  private isCodeExpired(createdAt: Date): boolean {
    return (
      new Date().getTime() - createdAt.getTime() >
      this.registerCodeValidSeconds * 1000
    );
  }

  async createRequest(email: string, code: string): Promise<void> {
    await this.prismaService.userRegisterRequest.create({
      data: {
        email: email,
        code: code,
      },
    });
  }

  async verifyRequest(email: string, code: string): Promise<boolean> {
    // Determine whether the email code is correct.
    const records = await this.prismaService.userRegisterRequest.findMany({
      where: { email },
    });
    for (const record of records) {
      if (this.isCodeExpired(record.createdAt)) {
        await this.prismaService.userRegisterRequest.delete({
          where: { id: record.id },
        });
        continue;
      }
      // For code that is netheir expired nor matched, just ignore it.
      if (record.code == code) {
        // Both email and code are correct, and the code is not expired.
        // The register request is valid, maybe not successful, but valid.
        // Thus, the code is used and should be deleted.
        await this.prismaService.userRegisterRequest.delete({
          where: { id: record.id },
        });
        return true;
      }
    }
    return false;
  }
}

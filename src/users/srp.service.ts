/*
 *  Description: This file implements the SRP service.
 *               It is responsible for handling SRP protocol operations.
 */

import { Injectable } from '@nestjs/common';
import { Client, Server } from '@ruc-cheese/node-srp-rs';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SrpService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly srpClient = new Client();
  private readonly srpServer = new Server();

  /**
   * 为新用户生成 SRP salt 和 verifier
   */
  async generateSrpCredentials(
    username: string,
    password: string,
  ): Promise<{
    salt: string;
    verifier: string;
  }> {
    const salt = this.srpClient.generateSalt();
    const privateKey = this.srpClient.derivePrivateKey(
      salt,
      username,
      password,
    );
    const verifier = this.srpClient.deriveVerifier(privateKey);

    return {
      salt,
      verifier,
    };
  }

  /**
   * 创建 SRP 服务器会话
   */
  async createServerSession(verifier: string): Promise<{
    serverEphemeral: { public: string; secret: string };
  }> {
    const serverEphemeral = this.srpServer.generateEphemeral(verifier);

    return {
      serverEphemeral,
    };
  }

  /**
   * 验证客户端的证明
   */
  async verifyClient(
    serverSecretEphemeral: string,
    clientPublicEphemeral: string,
    salt: string,
    username: string,
    verifier: string,
    clientProof: string,
  ): Promise<{
    success: boolean;
    serverProof: string;
  }> {
    try {
      const serverSession = this.srpServer.deriveSession(
        serverSecretEphemeral,
        clientPublicEphemeral,
        salt,
        username,
        verifier,
        clientProof,
      );

      return {
        success: true,
        serverProof: serverSession.proof,
      };
    } catch (error) {
      return {
        success: false,
        serverProof: '',
      };
    }
  }

  /**
   * 验证用户是否已经升级到 SRP
   */
  async isUserSrpUpgraded(userId: number): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { srpUpgraded: true },
    });
    return user?.srpUpgraded ?? false;
  }

  /**
   * 为现有用户升级到 SRP
   */
  async upgradeUserToSrp(
    userId: number,
    username: string,
    password: string,
  ): Promise<void> {
    const { salt, verifier } = await this.generateSrpCredentials(
      username,
      password,
    );

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        srpSalt: salt,
        srpVerifier: verifier,
        srpUpgraded: true,
      },
    });
  }
}

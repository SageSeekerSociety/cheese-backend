import { Injectable, OnModuleInit } from '@nestjs/common';
import { Avatar, AvatarType } from '@prisma/client';
import { Mutex } from 'async-mutex';
import { readdirSync } from 'fs';
import { join } from 'node:path';
import { PrismaService } from '../common/prisma/prisma.service';
import { AvatarNotFoundError } from './avatars.error';
@Injectable()
export class AvatarsService implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}
  private mutex = new Mutex();
  private initialized: boolean = false;

  async onModuleInit(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      if (!this.initialized) {
        await this.initialize();
        this.initialized = true;
      }
    });
  }
  private async initialize(): Promise<void> {
    const sourcePath = join(__dirname, '../resources/avatars');

    const avatarFiles = readdirSync(sourcePath);
    /* istanbul ignore if */
    if (!process.env.DEFAULT_AVATAR_NAME) {
      throw new Error(
        'DEFAULT_AVATAR_NAME environment variable is not defined',
      );
    }
    const defaultAvatarName = process.env.DEFAULT_AVATAR_NAME;

    const defaultAvatarPath = join(sourcePath, defaultAvatarName);

    // Before one test run, the table is ether empty or has the default avatar
    // so the test will not cover all branches.
    // However, the test will cover all branches in the second run.
    // So we ignore the coverage for this part.
    /* istanbul ignore next */
    await this.prismaService.$transaction(async (prismaClient) => {
      // Lock the table to prevent multiple initializations in testing
      // The SQL syntax is for PostgreSQL, so it may need to be changed for other databases
      prismaClient.$executeRaw`LOCK TABLE "avatar" IN ACCESS EXCLUSIVE MODE`;
      const defaultAvatar = await this.prismaService.avatar.findFirst({
        where: {
          avatarType: AvatarType.default,
        },
      });

      if (!defaultAvatar) {
        await this.prismaService.avatar.create({
          data: {
            url: defaultAvatarPath,
            name: defaultAvatarName,
            avatarType: AvatarType.default,
            usageCount: 0,
            createdAt: new Date(),
          },
        });
      }
      const predefinedAvatar = await this.prismaService.avatar.findFirst({
        where: {
          avatarType: AvatarType.predefined,
        },
      });
      if (!predefinedAvatar) {
        const predefinedAvatars = avatarFiles.filter(
          (file) => file !== defaultAvatarName,
        );
        if (predefinedAvatars.length === 0) {
          throw new Error('no predefined avatars found');
        }
        await Promise.all(
          predefinedAvatars.map(async (name) => {
            const avatarPath = join(sourcePath, name);
            await this.prismaService.avatar.create({
              data: {
                url: avatarPath,
                name,
                avatarType: AvatarType.predefined,
                usageCount: 0,
                createdAt: new Date(),
              },
            });
          }),
        );
      }
    });
  }

  save(path: string, filename: string): Promise<Avatar> {
    return this.prismaService.avatar.create({
      data: {
        url: path,
        name: filename,
        avatarType: AvatarType.upload,
        usageCount: 0,
        createdAt: new Date(),
      },
    });
  }
  async getOne(avatarId: number): Promise<Avatar> {
    const file = await this.prismaService.avatar.findUnique({
      where: {
        id: avatarId,
      },
    });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file;
  }
  async getAvatarPath(avatarId: number): Promise<string> {
    const file = await this.prismaService.avatar.findUnique({
      where: {
        id: avatarId,
      },
    });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file.url;
  }

  async getDefaultAvatarId(): Promise<number> {
    const defaultAvatar = await this.prismaService.avatar.findFirst({
      where: {
        avatarType: AvatarType.default,
      },
    });
    if (defaultAvatar == undefined) throw new Error('Default avatar not found');

    const defaultAvatarId = defaultAvatar.id;
    return defaultAvatarId;
  }

  async getPreDefinedAvatarIds(): Promise<number[]> {
    const PreDefinedAvatars = await this.prismaService.avatar.findMany({
      where: {
        avatarType: AvatarType.predefined,
      },
    });
    const PreDefinedAvatarIds = PreDefinedAvatars.map(
      (PreDefinedAvatars) => PreDefinedAvatars.id,
    );
    return PreDefinedAvatarIds;
  }

  async plusUsageCount(avatarId: number): Promise<void> {
    if ((await this.isAvatarExists(avatarId)) == false)
      throw new AvatarNotFoundError(avatarId);
    await this.prismaService.avatar.update({
      where: {
        id: avatarId,
      },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  async minusUsageCount(avatarId: number): Promise<void> {
    if ((await this.isAvatarExists(avatarId)) == false)
      throw new AvatarNotFoundError(avatarId);
    await this.prismaService.avatar.update({
      where: {
        id: avatarId,
      },
      data: {
        usageCount: {
          decrement: 1,
        },
      },
    });
  }

  async isAvatarExists(avatarId: number): Promise<boolean> {
    return (
      (await this.prismaService.avatar.count({
        where: {
          id: avatarId,
        },
      })) > 0
    );
  }
}

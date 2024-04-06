import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import { AvatarNotFoundError } from './avatars.error';
import { AvatarType } from './avatars.legacy.entity';
@Injectable()
export class AvatarsService implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}
  async onModuleInit(): Promise<void> {
    const sourcePath = join(__dirname, '../../src/avatars/resources');
    if (
      !(await this.prismaService.avatar.findFirst({
        where: { avatarType: AvatarType.Default },
      }))
    ) {
      this.prismaService.avatar.create({
        data: {
          url: join(sourcePath, 'default.jpg'),
          name: 'default.jpg',
          avatarType: AvatarType.Default,
          usageCount: 0,
        },
      });
    }
    if (
      !(await this.prismaService.avatar.findFirst({
        where: { avatarType: AvatarType.PreDefined },
      }))
    ) {
      const PreDefinedAvatarNames = ['pre1.jpg', 'pre2.jpg', 'pre3.jpg'];
      for (const name of PreDefinedAvatarNames) {
        this.prismaService.avatar.create({
          data: {
            url: join(sourcePath, name),
            name: name,
            avatarType: AvatarType.PreDefined,
            usageCount: 0,
          },
        });
      }
    }
  }

  async save(path: string, filename: string): Promise<number> {
    const avatar = await this.prismaService.avatar.create({
      data: {
        url: path,
        name: filename,
        avatarType: AvatarType.Upload,
        usageCount: 0,
      },
    });
    return avatar.id;
  }

  async getAvatarPath(avatarId: number): Promise<string> {
    const file = await this.prismaService.avatar.findUnique({
      where: { id: avatarId },
    });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file.url;
  }

  async getDefaultAvatarId(): Promise<number> {
    const defaultAvatar = await this.prismaService.avatar.findFirstOrThrow({
      where: { avatarType: AvatarType.Default },
    });
    return defaultAvatar.id;
  }

  async getPreDefinedAvatarIds(): Promise<number[]> {
    const preDefinedAvatars = await this.prismaService.avatar.findMany({
      where: { avatarType: AvatarType.PreDefined },
    });
    return preDefinedAvatars.map((preDefinedAvatar) => preDefinedAvatar.id);
  }

  async isAvatarExists(avatarId: number): Promise<boolean> {
    return !!(await this.prismaService.avatar.findUnique({
      where: { id: avatarId },
    }));
  }

  async plusUsageCount(avatarId: number): Promise<void> {
    if (!(await this.isAvatarExists(avatarId))) {
      throw new AvatarNotFoundError(avatarId);
    }
    this.prismaService.avatar.update({
      where: { id: avatarId },
      data: { usageCount: { increment: 1 } },
    });
  }

  async minusUsageCount(avatarId: number): Promise<void> {
    if (!(await this.isAvatarExists(avatarId))) {
      throw new AvatarNotFoundError(avatarId);
    }
    this.prismaService.avatar.update({
      where: { id: avatarId },
      data: { usageCount: { decrement: 1 } },
    });
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import path, { join } from 'path';
import { Repository } from 'typeorm';
import { AvatarNotFoundError } from './avatars.error';
import { Avatar, AvatarType } from './avatars.legacy.entity';
@Injectable()
export class AvatarsService implements OnModuleInit {
  constructor(
    @InjectRepository(Avatar)
    private readonly avatarRepository: Repository<Avatar>,
  ) {}
  async onModuleInit(): Promise<void> {
    this.initialize();
  }
  private async initialize(): Promise<void> {
    const sourcePath = join(__dirname, '../../src/avatars/resources');
    if (
      !(await this.avatarRepository.findOneBy({
        avatarType: AvatarType.Default,
      }))
    ) {
      const defaultAvatar = this.avatarRepository.create({
        url: join(sourcePath, 'default.jpg'),
        name: 'default.jpg',
        avatarType: AvatarType.Default,
        usageCount: 0,
      });
      await this.avatarRepository.save(defaultAvatar);
    }
    if (
      !(await this.avatarRepository.findOneBy({
        avatarType: AvatarType.PreDefined,
      }))
    ) {
      const PreDefinedAvatarNames = ['pre1.jpg', 'pre2.jpg', 'pre3.jpg'];
      for (const name of PreDefinedAvatarNames) {
        const PreDefinedAvatar = this.avatarRepository.create({
          url: join(sourcePath, name),
          name: name,
          avatarType: AvatarType.PreDefined,
          usageCount: 0,
        });
        await this.avatarRepository.save(PreDefinedAvatar);
      }
    }
  }

  async save(path: string, filename: string) {
    const avatar = this.avatarRepository.create({
      url: path,
      name: filename,
      avatarType: AvatarType.Upload,
    });
    return this.avatarRepository.save(avatar);
  }
  async getOne(avatarId: number): Promise<Avatar> {
    const file = await this.avatarRepository.findOneBy({ id: avatarId });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file;
  }
  async getAvatarPath(avatarId: number): Promise<string> {
    const file = await this.avatarRepository.findOneBy({ id: avatarId });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return path.join(__dirname, '//images', file.name);
  }

  async getDefaultAvatarId(): Promise<number> {
    const defaultAvatar = await this.avatarRepository.findOneBy({
      avatarType: AvatarType.Default,
    });
    if (defaultAvatar == undefined) throw new Error();
    const defaultAvatarId = defaultAvatar.id;
    return defaultAvatarId;
  }

  async getPreDefinedAvatarIds(): Promise<number[]> {
    const PreDefinedAvatars = await this.avatarRepository.findBy({
      avatarType: AvatarType.PreDefined,
    });
    const PreDefinedAvatarIds = PreDefinedAvatars.map(
      (PreDefinedAvatars) => PreDefinedAvatars.id,
    );
    return PreDefinedAvatarIds;
  }

  async plusUsageCount(avatarId: number): Promise<void> {
    const avatar = await this.avatarRepository.findOneBy({ id: avatarId });
    if (avatar == undefined) throw new AvatarNotFoundError(avatarId);
    avatar.usageCount += 1;
    await this.avatarRepository.save(avatar);
    return;
  }

  async minusUsageCount(avatarId: number): Promise<void> {
    const avatar = await this.avatarRepository.findOneBy({ id: avatarId });
    if (avatar == undefined) throw new AvatarNotFoundError(avatarId);
    avatar.usageCount -= 1;
    await this.avatarRepository.save(avatar);
    return;
  }
}

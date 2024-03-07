import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path';
import { Repository } from 'typeorm';
import { AvatarNotFoundError } from './avatars.error';
import { Avatar } from './avatars.legacy.entity';
@Injectable()
export class AvatarsService {
  constructor(
    @InjectRepository(Avatar)
    private readonly avatarRepository: Repository<Avatar>,
  ) {}
  async save(path: string, filename: string) {
    const avatar = this.avatarRepository.create({
      url: path,
      name: filename,
    });
    return this.avatarRepository.save(avatar);
  }
  async findOne(avatarId: number): Promise<Avatar> {
    const file = await this.avatarRepository.findOneBy({ id: avatarId });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file;
  }
  async getDefaultAvatarIds(): Promise<number[]> {
    const defaultAvatars = await this.avatarRepository.findBy({
      isDefault: true,
    });
    if (defaultAvatars.length === 0) {
      const sourcePath = join(
        __dirname,
        '../../src/avatars/resources/default.jpg',
      );
      const defaultAvatar = this.avatarRepository.create({
        url: sourcePath,
        name: 'default.jpg',
        isDefault: true,
        usageCount: 0,
      });
      const avatar = await this.avatarRepository.save(defaultAvatar);
      console.log(avatar.isDefault);
      return [avatar.id];
    }
    const defaultAvatarIds = defaultAvatars.map((avatar) => avatar.id);
    console.log(defaultAvatarIds);
    return defaultAvatarIds;
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

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readdirSync } from 'fs';
import { join } from 'path';
import { EntityManager, Repository } from 'typeorm';
import { AvatarNotFoundError } from './avatars.error';
import { Avatar, AvatarType } from './avatars.legacy.entity';
import { Mutex } from 'async-mutex';
@Injectable()
export class AvatarsService implements OnModuleInit {
  constructor(
    @InjectRepository(Avatar)
    private readonly avatarRepository: Repository<Avatar>,
    private readonly entityManager: EntityManager,
  ) {}
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

    await this.entityManager.transaction(
      async (entityManager: EntityManager) => {
        const avatarRepository = entityManager.getRepository(Avatar);
        // Lock the table to prevent multiple initializations in testing
        // The SQL syntax is for PostgreSQL, so it may need to be changed for other databases
        entityManager.query('LOCK TABLE "avatar" IN ACCESS EXCLUSIVE MODE');
        let defaultAvatar = await avatarRepository.findOneBy({
          avatarType: AvatarType.default,
        });

        if (!defaultAvatar) {
          defaultAvatar = avatarRepository.create({
            url: defaultAvatarPath,
            name: defaultAvatarName,
            avatarType: AvatarType.default,
            usageCount: 0,
          });
          await avatarRepository.save(defaultAvatar);
        }
        const predefinedAvatar = await avatarRepository.findOneBy({
          avatarType: AvatarType.predefined,
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
              const predefinedAvatar = avatarRepository.create({
                url: avatarPath,
                name,
                avatarType: AvatarType.predefined,
                usageCount: 0,
              });
              await avatarRepository.save(predefinedAvatar);
            }),
          );
        }
      },
    );
  }

  async save(path: string, filename: string) {
    const avatar = this.avatarRepository.create({
      url: path,
      name: filename,
      avatarType: AvatarType.upload,
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
    return file.url;
  }

  async getDefaultAvatarId(): Promise<number> {
    const defaultAvatar = await this.avatarRepository.findOneBy({
      avatarType: AvatarType.default,
    });
    if (defaultAvatar == undefined) throw new Error('Default avatar not found');

    const defaultAvatarId = defaultAvatar.id;
    return defaultAvatarId;
  }

  async getPreDefinedAvatarIds(): Promise<number[]> {
    const PreDefinedAvatars = await this.avatarRepository.findBy({
      avatarType: AvatarType.predefined,
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

  async isAvatarExists(avatarId: number): Promise<boolean> {
    return (await this.avatarRepository.countBy({ id: avatarId })) > 0;
  }
}

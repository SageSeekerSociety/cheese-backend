import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Avatar } from './avatars.legacy.entity';
import { Repository } from 'typeorm';
import { error } from 'console';

@Injectable()
export class AvatarsService {
  constructor(
    @InjectRepository(Avatar)
    public avatarRepository: Repository<Avatar>,
  ) {}
  async save(filename: string, userid: number) {
    const topic = this.avatarRepository.create({
      name: filename,
      userid: userid,
    });
    return this.avatarRepository.save(topic);
  }
  async findOne(avatarId: number): Promise<Avatar> {
    const file = await this.avatarRepository.findOneBy({ id: avatarId });
    if (file == undefined) throw error;
    return file;
  }
}

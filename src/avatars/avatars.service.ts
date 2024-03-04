import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupsService } from '../groups/groups.service';
import { UsersService } from '../users/users.service';
import {
  AvatarNotFoundError,
  InvalidGroupIdError,
  InvalidOwnerTypeError,
  InvalidUserIdError,
} from './avatars.error';
import { Avatar } from './avatars.legacy.entity';

@Injectable()
export class AvatarsService {
  constructor(
    //@Inject(forwardRef(() => GroupsService))
    private readonly groupservice: GroupsService,
    private readonly userservice: UsersService,
    @InjectRepository(Avatar)
    private readonly avatarRepository: Repository<Avatar>,
  ) {}
  async save(filename: string, userid: number, type: string, id: number) {
    if (type == 'user') {
      console.log(userid);
      console.log(id);
      if (id != userid) {
        throw new InvalidUserIdError();
      }
      const profile = await this.userservice.userProfileRepository.findOneBy({
        userId: userid,
      });
      const avatar = this.avatarRepository.create({
        name: filename,
        userProfileId: profile?.id,
      });
      return this.avatarRepository.save(avatar);
    } else if (type == 'group') {
      const is_owner = (await this.groupservice.getGroupDtoById(userid, id))
        .is_owner;
      if (!is_owner) throw new InvalidGroupIdError();
      //const profile = await this.groupProfilesRepository
      //.findOneBy({groupId:id});
      const profile = await this.groupservice.groupProfilesRepository.findOneBy(
        { groupId: id },
      );
      const avatar = this.avatarRepository.create({
        name: filename,
        groupProfileId: profile?.id,
      });
      return this.avatarRepository.save(avatar);
    } else throw new InvalidOwnerTypeError();
  }
  async findOne(avatarId: number): Promise<Avatar> {
    const file = await this.avatarRepository.findOneBy({ id: avatarId });
    if (file == undefined) throw new AvatarNotFoundError(avatarId);
    return file;
  }
}

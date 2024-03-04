import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserProfile } from '../users/users.legacy.entity';
import { GroupProfile } from '../groups/group-profile.entity';
@Entity()
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  @Index({ unique: false })
  userProfileId: number;

  @ManyToOne(() => UserProfile, (user) => user.avatars, { nullable: true })
  userProfile: UserProfile;

  @Column({ nullable: true })
  @Index({ unique: false })
  groupProfileId: number;

  @ManyToOne(() => GroupProfile, (group) => group.avatars, { nullable: true })
  groupProfile: GroupProfile;

  @CreateDateColumn()
  createdAt: Date;
}

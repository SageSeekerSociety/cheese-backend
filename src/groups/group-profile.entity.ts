import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Avatar } from '../avatars/avatars.legacy.entity';
import { Group } from './groups.legacy.entity';

@Entity()
export class GroupProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  intro: string;

  @ManyToOne(() => Avatar)
  avatar: Avatar;

  @Column()
  avatarId: number;

  @OneToOne(() => Group, (group) => group.profile)
  @JoinColumn()
  group: Group;

  @Column()
  groupId: number;

  // todo: visibility

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

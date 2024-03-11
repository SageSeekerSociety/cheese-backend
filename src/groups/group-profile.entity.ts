import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './groups.legacy.entity';

@Entity()
export class GroupProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  intro: string;

  @Column()
  avatar: string;

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

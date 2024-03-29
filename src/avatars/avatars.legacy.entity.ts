import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AvatarType {
  Default = 'default',
  PreDefined = 'predefined',
  Upload = 'upload',
}

@Entity()
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  usageCount: number;

  @Column()
  avatarType: AvatarType;

  @CreateDateColumn()
  createdAt: Date;
}

import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  groupName: string;

  @Column()
  creatorId: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @Column()
  deletedAt?: Date;
}

@Entity()
export class GroupProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Group)
  @Index({ unique: true })
  @JoinColumn()
  group: Group; // This links the profile to the corresponding group

  @Column()
  displayName: string; // The name displayed to users, can be changed

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar: string; // Group image or avatar

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity()
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group)
  @Index()
  group: Group;

  @Column()
  groupId: number;

  @ManyToOne(() => User)
  @Index()
  user: User;

  @Column()
  userId: number;

  @Column()
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity()
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
  @Column()
  userid: number;
  @CreateDateColumn()
  createdAt: Date;
}

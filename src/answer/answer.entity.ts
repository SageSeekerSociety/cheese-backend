import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity()
  export class Answer {
    @PrimaryGeneratedColumn()
    id: string;
  
    @Column()
    @Index({ unique: false })
    askerUserId: number;
  
    // Use column type 'text' to support arbitrary length of string.
    @Column('text')
    // Use fulltext index to support fulltext search.
    @Index({ fulltext: true, parser: 'ngram' })
    title: string;
  
    // Use column type 'text' to support arbitrary length of string.
    @Column('text')
    // Use fulltext index to support fulltext search.
    @Index({ fulltext: true, parser: 'ngram' })
    content: string;
  
    @Column()
    type: number;
  
    @Column({ nullable: true })
    @Index({ unique: false })
    groupId?: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @DeleteDateColumn()
    deletedAt: Date;
  }
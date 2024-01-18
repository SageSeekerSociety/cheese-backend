import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
  
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

    //likes
    @Column('text', {array: true, nullable: true})
    likes: string[];

    @Column({default: 0})
    likesCount: number;

    //favorite
    @Column({default: false})
    isFavorited: boolean;

    @Column({
        type: 'simple-array',
        default: [],
        transformer: {
          to: (value: string[]) => JSON.stringify(value),
          from: (value: string) => JSON.parse(value)
        }
    })
    favoritedBy: string[];

    @Column({default: 0})
    favoriteCount: number;

    //comment
    @Column({ type: 'simple-json', nullable: true }) 
    comments: { userId: string, comment: string, createdAt: Date }[]; 

    @Column({default: 0})
    commentCount: number;
  
  }
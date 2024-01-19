import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Comment } from './comments.entity';
import { CreateCommentDto } from './DTO/CreateComment.dto';
import { FindOneOptions } from 'typeorm';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async createComment(createCommentDto: CreateCommentDto): Promise<Comment> {
    const { content, authorId, agreeCount } = createCommentDto;
    const comment = this.commentRepository.create({
      content,
      authorId,
      agreeCount: agreeCount || 0,
    });
  
    const savedComment = await this.commentRepository.save(comment);
  
    // Fetch the comment by ID after saving
    const createdComment = await this.commentRepository.findOne(savedComment.id as FindOneOptions);
  
    if (!createdComment) {
      // Handle the case where the comment is not found
      throw new Error('Failed to retrieve the created comment.');
    }
  
    return createdComment;
  }
  
  
  

  async getCommentById(id: string | number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: +id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async getCommentDetail(id: string | number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: +id },
      relations: ['relatedEntities'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async deleteComment(id: number): Promise<void> {
    const result = await this.commentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Comment not found');
    }
  }

  async agreeComment(id: number): Promise<void> {
    const comment = await this.getCommentById(id);
    comment.agreeCount = (comment.agreeCount || 0) + 1;
    await this.commentRepository.save(comment);
  }

  async commentAnswer(id: number, createCommentDto: CreateCommentDto): Promise<Comment> {
    const parentComment = await this.getCommentById(id);

    const { DeepPartial } = require('typeorm');

    const { content, authorId, agreeCount } = createCommentDto;

    const answerComment: DeepPartial<Comment> = {
      content,
      authorId,
      agreeCount: agreeCount || 0,
      ...(parentComment ? { parentComment } : {}),
    };

    const createdAnswer = this.commentRepository.create(answerComment);

    return this.commentRepository.save(createdAnswer);
  }
}

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
    const { content, answerId, agreeCount, userId } = createCommentDto;
  
    const comment = this.commentRepository.create({
      content,
      answerId,
      agreeCount: agreeCount || 0,
      userId,
    });
  
    const savedComment = await this.commentRepository.save(comment);
  
    if (!savedComment) {
      throw new Error('Failed to save the comment.');
    }
  
    return savedComment;
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
      relations: ['quote'],
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

  async commentAnswer(parentCommentId: number, createCommentDto: CreateCommentDto): Promise<Comment> {
    const parentComment = await this.getCommentById(parentCommentId);

    const { content, answerId, agreeCount, userId } = createCommentDto;

    const answerComment: DeepPartial<Comment> = {
      content,
      answerId,
      agreeCount: agreeCount || 0,
      userId,
      quote: parentComment,
    };

    const createdAnswer = this.commentRepository.create(answerComment);

    return this.commentRepository.save(createdAnswer);
  }
}

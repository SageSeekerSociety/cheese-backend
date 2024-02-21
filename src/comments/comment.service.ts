import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '../answer/answer.entity';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { Question } from '../questions/questions.entity';
import { User } from '../users/users.entity';
import { UserIdNotFoundError } from '../users/users.error';
import { AgreeCommentDto } from './DTO/agreeComment.dto';
import { GetCommentDetailDto } from './DTO/getCommentDetail.dto';
import { GetCommentsResponseDto } from './DTO/getComments.dto';
import { Comment, UserAttitudeOnComments } from './comment.entity';
import { CommentNotFoundByUserError, CommentNotFoundError, CommentableIdNotFoundError, InvalidAgreeTypeError } from './comment.error';
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAttitudeOnComments)
    private userAttitudeOnCommentsRepository: Repository<UserAttitudeOnComments>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Answer)
    private answersRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  async createComment(
    userId: number,
    content: string,
    commentableType: 'answer' | 'comment' | 'question',
    commentableId: number,
  ): Promise<number> {
    let commentableRepository;
    switch (commentableType) {
      case 'answer':
        commentableRepository = this.answersRepository;
        break;
      case 'comment':
        commentableRepository = this.commentsRepository;
        break;
      case 'question':
        commentableRepository = this.questionsRepository;
        break;
    }
    const commentable = await commentableRepository.findOneBy({id : commentableId});
    if (!commentable) {
      throw new CommentableIdNotFoundError(commentableId);
    }

    const comment = this.commentsRepository.create({
      userId,
      content,
      commentableType,
      commentableId,
    });
    const userAttitudeOnComment = this.userAttitudeOnCommentsRepository.create({
      agreeType:0,
      userId:userId,
    });
    comment.agreeCount=0;
    comment.disagreeCount=0;
    const savedComment = await this.commentsRepository.save(comment); // 保存评论到数据库
    await this.userAttitudeOnCommentsRepository.save(userAttitudeOnComment)
    return savedComment.id;
  }

  async deleteComment(userId: number, commentId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId },
    });

    if (!comment) {
      throw new CommentNotFoundByUserError(userId);
    }

    await this.commentsRepository.softRemove(comment);
  }

  async getComments(
    userId:number,
    commentableId: number,
    pageStart: number = 0,
    pageSize: number = 20,
  ): Promise<GetCommentsResponseDto> {
    const comment = await this.commentsRepository.findOneBy({ id: commentableId });
    const user=await this.usersRepository.findOneBy({id:userId})  
    const userAttitudeOnComment = await this.userAttitudeOnCommentsRepository.findOne({
      where: { id:commentableId, userId },
    });
    if (!comment) {
      throw new CommentNotFoundError(commentableId);
    }

    const hasPrev = pageStart > 0;
    const hasMore = false;

    let prevStart: number | undefined;
    if (hasPrev) {
      prevStart = Math.max(0, pageStart - pageSize);
    }

    const page: PageRespondDto = {
      page_start: pageStart,
      page_size: pageSize,
      has_prev: hasPrev,
      prev_start: prevStart,
      has_more: hasMore,
      next_start: undefined,
    };

    const commentsData = [{
      comment: {
        id: comment.id,
        commentableId: comment.commentableId,
        commentableType: comment.commentableType,
        content: comment.content,
        user: comment.user,
        createdAt: comment.createdAt.getTime(),
        agreeCount: comment.agreeCount,
        disagreeCount: comment.disagreeCount,
        agreeType:user?userAttitudeOnComment?userAttitudeOnComment.agreeType:0:0,
      },
    }];
    
    return {
      code: 200,
      message: 'get comment',
      data: {
        comments: commentsData,
        page,
      },
    };
  }

  async agreeComment(userId:number, commentId: number, agreeType: AgreeCommentDto) {
    const user = await this.usersRepository.findOneBy({
      id: userId,
    })
    if(!user)  {
      throw new UserIdNotFoundError(userId);
      return;
    }
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    const userAttitudeOnComment = await this.userAttitudeOnCommentsRepository.findOne({
      where: { id:commentId, userId },
    });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    switch (agreeType.agree_type) {
      case 0:
        break;
      case 1:
        if(userAttitudeOnComment?.agreeType==1){
          break;
        }else{
          if(userAttitudeOnComment?.agreeType==2) {
            comment.disagreeCount = comment.disagreeCount - 1;
          }
          comment.agreeCount = comment.agreeCount + 1;
        }
        break;
      case 2:
        if(userAttitudeOnComment?.agreeType==2){
          break;
        }else{
          if(userAttitudeOnComment?.agreeType==1) {
            comment.agreeCount = comment.agreeCount - 1;
          }
          comment.disagreeCount = comment.disagreeCount + 1;
        }
        break;
      default:
        throw new InvalidAgreeTypeError(agreeType.agree_type);
    }
    return;
  }

  async getCommentDetail(userId:number, commentId: number): Promise<GetCommentDetailDto> {
    const comment = await this.commentsRepository.findOneBy({
      id: commentId,
    });
    const user= await this.usersRepository.findOneBy({id:userId})
    const userAttitudeOnComment = await this.userAttitudeOnCommentsRepository.findOne({
      where: { id:commentId, userId },
    });
    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }
    const commentDto:GetCommentDetailDto = {
      code: 200,
      message: 'Get comment details successfully',
      id: comment.id,
      content: comment.content,
      commentableId: comment.commentableId,
      commentableType: comment.commentableType,
      user: comment.user,
      disagreeCount: comment.disagreeCount,
      agreeCount: comment.agreeCount,
      createdAt: comment.createdAt.getDate(),
      agreeType:user?userAttitudeOnComment?userAttitudeOnComment.agreeType:0:0,
    };
    return commentDto;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommentsService } from './comment.service';
import { Comment } from './comment.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AgreeCommentDto } from './DTO/agreeComment.dto';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepository: Repository<Comment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useClass: Repository,
        },
        // Add other services or dependencies here
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentRepository = module.get<Repository<Comment>>(
      getRepositoryToken(Comment),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment', async () => {
      const userId = 1;
      const content = 'Test comment';
      const commentableType = 'answer';
      const commentableId = 1;
      jest
        .spyOn(service['usersService'], 'getUserDtoById')
        .mockResolvedValue({ id: userId } as any);
      jest.spyOn(commentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(commentRepository, 'save').mockResolvedValue({ id: 1 } as any);

      const result = await service.createComment(
        userId,
        content,
        commentableType,
        commentableId,
      );

      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      expect(result.message).toBe('comment successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 1;
      const content = 'Test comment';
      const commentableType = 'answer';
      const commentableId = 1;
      jest
        .spyOn(service['usersService'], 'getUserDtoById')
        .mockResolvedValue(undefined);

      await expect(
        service.createComment(userId, content, commentableType, commentableId),
      ).rejects.toThrowError(NotFoundException);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const userId = 1;
      const commentId = 1;
      const comment = { id: commentId, userId };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);
      jest
        .spyOn(service['commentsRepository'], 'softRemove')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service['commentRelationshipRepository'], 'softRemove')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service['commentMembershipsRepository'], 'softRemove')
        .mockResolvedValue(undefined);

      await expect(
        service.deleteComment(userId, commentId),
      ).resolves.not.toThrow();

      expect(service['commentsRepository'].findOne).toHaveBeenCalledWith({
        where: { id: commentId, userId: userId },
      });
      expect(service['commentsRepository'].softRemove).toHaveBeenCalledWith(
        comment,
      );
      expect(
        service['commentRelationshipRepository'].softRemove,
      ).toHaveBeenCalledWith(comment);
      expect(
        service['commentMembershipsRepository'].softRemove,
      ).toHaveBeenCalledWith(comment);
    });

    it('should throw NotFoundException if comment not found', async () => {
      const userId = 1;
      const commentId = 1;
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(null);

      await expect(
        service.deleteComment(userId, commentId),
      ).rejects.toThrowError(NotFoundException);
    });
  });

  describe('getComments', () => {
    it('should return comments with subcomments and pagination information', async () => {
      const commentId = 1;
      const comment = { id: commentId };
      const subComments = [{ id: 2 }, { id: 3 }];
      jest
        .spyOn(service['commentsRepository'], 'findOneBy')
        .mockResolvedValue(comment as any);
      jest
        .spyOn(service['commentsRepository'], 'find')
        .mockResolvedValue(subComments as any);

      const result = await service.getComments(commentId);

      expect(result.data.comments).toHaveLength(1);
      expect(result.data.comments[0].comment.id).toEqual(commentId);
      expect(result.data.comments[0].sub_comment_count).toEqual(
        subComments.length,
      );
      expect(result.data.comments[0].sub_comments).toHaveLength(
        subComments.length,
      );
      expect(result.data.page).toEqual(
        expect.objectContaining({
          page_start: 0,
          page_size: 20,
          has_prev: false,
          has_more: false,
        }),
      );
    });

    it('should throw NotFoundException if comment not found', async () => {
      const commentId = 1;
      jest
        .spyOn(service['commentsRepository'], 'findOneBy')
        .mockResolvedValue(null);

      await expect(service.getComments(commentId)).rejects.toThrowError(
        NotFoundException,
      );
    });
  });

  describe('agreeComment', () => {
    it('should increment agreeCount if agreeType is 1', async () => {
      const commentId = 1;
      const agreeType = new AgreeCommentDto();
      const comment = { id: commentId, agreecount: 0 };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);

      await service.agreeComment(commentId, agreeType);

      expect(comment.agreecount).toBe(1);
    });

    it('should increment disagreeCount if agreeType is 2', async () => {
      const commentId = 1;
      const agreeType = new AgreeCommentDto();
      const comment = { id: commentId, disagreecount: 0 };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);

      await service.agreeComment(commentId, agreeType);

      expect(comment.disagreecount).toBe(1);
    });

    it('should not change counts if agreeType is 0', async () => {
      const commentId = 1;
      const agreeType = new AgreeCommentDto();
      const comment = { id: commentId, agreecount: 0, disagreecount: 0 };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);

      await service.agreeComment(commentId, agreeType);

      expect(comment.agreecount).toBe(0);
      expect(comment.disagreecount).toBe(0);
    });

    it('should throw NotFoundException if comment not found', async () => {
      const commentId = 1;
      const agreeType = new AgreeCommentDto();
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(undefined);

      await expect(
        service.agreeComment(commentId, agreeType),
      ).rejects.toThrowError(NotFoundException);
    });

    it('should throw Error if agreeType is invalid', async () => {
      const commentId = 1;
      const agreeType = new AgreeCommentDto();
      const comment = { id: commentId };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);

      await expect(
        service.agreeComment(commentId, agreeType),
      ).rejects.toThrowError('Invalid agreeType value');
    });
  });

  describe('getCommentDetail', () => {
    it('should return comment detail', async () => {
      const commentId = 1;
      const comment = {
        id: commentId,
        content: 'test',
        commentableId: 1,
        commentableType: 'answer',
        quote_id: 1,
        quote_user: {},
      };
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(comment as any);

      const result = await service.getCommentDetail(commentId);

      expect(result).toEqual(
        expect.objectContaining({
          code: 200,
          message: 'Get comment details successfully',
          data: comment,
        }),
      );
    });

    it('should throw NotFoundException if comment not found', async () => {
      const commentId = 1;
      jest
        .spyOn(service['commentsRepository'], 'findOne')
        .mockResolvedValue(undefined);

      await expect(service.getCommentDetail(commentId)).rejects.toThrowError(
        NotFoundException,
      );
    });
  });
});

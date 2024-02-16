import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comment.controller';
import { CommentsService } from './comment.service';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AgreeCommentResponseDto } from './DTO/agreeComment.dto';
import { UserDto } from '../users/DTO/user.dto';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [CommentsService],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const userId = 1;
      const content = 'test content';
      const CommentableType = 'answer';
      const CommentableId = 1;
      const auth = 'dummy-auth-token';
      const expectedData = { id: 1, content, user: userId };

      jest
        .spyOn(service, 'createComment')
        .mockResolvedValueOnce({ data: expectedData } as any);

      const result = await controller.createComment(
        CommentableType,
        CommentableId,
        content,
        auth,
      );

      expect(result).toEqual({
        code: 200,
        message: 'Create comment successfully',
        data: expectedData,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const CommentableType = 'answer';
      const CommentableId = 1;
      const auth = 'dummy-auth-token';
      const content = 'test';
      jest
        .spyOn(service['authService'], 'verify')
        .mockReturnValueOnce({ userId: undefined });

      await expect(
        controller.createComment(CommentableType, CommentableId, content, auth),
      ).rejects.toThrowError(NotFoundException);
    });

    // Add more test cases for different scenarios
  });

  describe('getComments', () => {
    it('should return comments data', async () => {
      const commentId = 1;
      const pageStart = 0;
      const pageSize = 10;

      const expectedData = {
        commentDto: { id: 1, content: 'Test comment', user: 1 }, // Mocked commentDto
        subComments: [{ id: 2, content: 'Sub comment', user: 2 }], // Mocked subComments
        page: {
          page_start: 0,
          page_size: 10,
          has_prev: false,
          prev_start: undefined,
          has_more: false,
          next_start: undefined,
        }, // Mocked page
      };

      jest.spyOn(service, 'getComments').mockResolvedValueOnce(expectedData);

      const result = await controller.getComments(
        commentId,
        pageStart,
        pageSize,
      );

      expect(result).toEqual({
        code: 200,
        message: 'Get comments successfully',
        data: expectedData,
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      const commentId = 999; // Non-existing comment ID

      jest
        .spyOn(service, 'getComments')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.getComments(commentId)).rejects.toThrowError(
        NotFoundException,
      );
    });

    // Add more test cases for different scenarios
  });
  // Add tests for other controller methods

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      const userId = 1;
      const commentId = 1;
      const auth = 'wwww'; // Mocked auth object
      jest.spyOn(AuthService, 'verify').mockReturnValueOnce({ userId });

      await controller.deleteComment(userId, commentId, auth);

      expect(service.deleteComment).toHaveBeenCalledWith(userId, commentId);
    });

    it('should throw NotFoundException if user is not authorized', async () => {
      const userId = undefined; // Unauthorized user
      const commentId = 1;
      const auth = 'wwww';
      jest.spyOn(AuthService, 'verify').mockReturnValueOnce({ userId });

      await expect(
        controller.deleteComment(userId, commentId, auth),
      ).rejects.toThrowError(NotFoundException);
    });

    // Add more test cases for different scenarios
  });

  describe('agreeComment', () => {
    it('should agree to a comment', async () => {
      const userId = 1;
      const commentId = 1;
      const agree_type = 1;
      const auth = 'wwww';
      jest.spyOn(AuthService, 'verify').mockReturnValueOnce({ userId });

      const requestBody: AgreeCommentResponseDto = {
        code: 0,
        message: ' ',
        data: { agree_type: agree_type },
      };

      await controller.agreeComment(commentId, requestBody, auth);

      expect(service.agreeComment).toHaveBeenCalledWith(
        userId,
        commentId,
        agree_type,
      );
    });

    // Add more test cases for different scenarios
  });

  describe('getCommentDetail', () => {
    it('should return comment details', async () => {
      const commentId = 1;
      const id = 1;
      const content = 'Test comment';
      const commentableId = 1;
      const commentableType = 'question';
      const quote = {
        quote_id: undefined,
        quote_user: undefined,
      };
      const user = UserDto;
      const create_at = '2018-01-01T00:00:00.000Z';
      const agree_type = 1;
      const agree_count = 1;
      const disagree_count = 1;
      jest
        .spyOn(service, 'getCommentDetail')
        .mockResolvedValueOnce({
          data: {
            id,
            content,
            commentableId,
            commentableType,
            quote,
            user,
            create_at,
            agree_type,
            agree_count,
            disagree_count,
          },
        });

      const result = await controller.getCommentDetail(commentId);

      expect(result).toEqual({
        code: 200,
        message: 'Details are as follows',
        data: result,
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      const commentId = 1;

      jest
        .spyOn(service, 'getCommentDetail')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.getCommentDetail(commentId)).rejects.toThrowError(
        NotFoundException,
      );
    });

    // Add more test cases for different scenarios
  });
});

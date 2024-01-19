import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CreateCommentDto } from './DTO/CreateComment.dto';
import { Comment } from './comments.entity';
import { CommentService } from './comments.service';

jest.useFakeTimers();

describe('CommentService', () => {
  let service: CommentService;
  let commentRepository: Repository<Comment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(Comment),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentRepository = module.get<Repository<Comment>>(getRepositoryToken(Comment));

    // Mocking create and save
    jest.spyOn(commentRepository, 'create').mockImplementation((dto: CreateCommentDto) => {
      return { ...dto, id: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
    });

    jest.spyOn(commentRepository, 'save').mockImplementation((comment: DeepPartial<Comment>) => {
      return Promise.resolve({ ...comment, id: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as Comment);
    });

    // Mocking findOne
    jest.spyOn(commentRepository, 'findOne').mockResolvedValue({ id: 1 } as Comment);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(commentRepository).toBeDefined();
  });

  it('should create a comment', async () => {
    const createCommentDto: CreateCommentDto = {
      content: 'Test Comment',
      authorId: 1,
      agreeCount: 0,
    };

    // Use await to ensure the asynchronous operation is completed before moving to the next step
    const createdComment = await service.createComment(createCommentDto);

    // Ensure that findOne was called with the correct parameters
    expect(commentRepository.findOne).toHaveBeenCalledWith(1);

    // Check if the createdComment has the 'id' property
    expect(createdComment).toHaveProperty('id');
    // Additional checks for other properties if needed
    // Add checks for other properties as needed
  });


  it('should handle non-existing comment during getCommentById', async () => {
    jest.spyOn(commentRepository, 'findOne').mockResolvedValue(null);

    await expect(service.getCommentById(2)).rejects.toThrow(NotFoundException);
    expect(commentRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  // Modify findOne call parameters test case
  it('should call findOne with correct parameters during createComment', async () => {
    const createCommentDto: CreateCommentDto = {
      content: 'Test Comment',
      authorId: 1,
      agreeCount: 0,
    };

    // Use await to ensure the asynchronous operation is completed before checking the expectation
    await service.createComment(createCommentDto);

    // Ensure that findOne was called with the correct parameters
    expect(commentRepository.findOne).toHaveBeenCalledWith(1);
  });
});

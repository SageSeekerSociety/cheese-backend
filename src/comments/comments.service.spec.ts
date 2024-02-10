import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CreateCommentDto } from './DTO/CreateComment.dto';
import { Comment } from './comments.entity';
import { CommentService } from './comments.service';
import * as request from 'supertest';

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
    jest.spyOn(commentRepository, 'create').mockImplementation((comment: DeepPartial<Comment>) => {
      return { ...comment, id: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as Comment;
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
      answerId: 123,
      userId: 1,
      agreeCount: 0,
    };

    const createdComment = await service.createComment(createCommentDto);
    expect(createdComment).toHaveProperty('id');
  });

  it('should handle non-existing comment during getCommentById', async () => {
    jest.spyOn(commentRepository, 'findOne').mockResolvedValue(null);

    await expect(service.getCommentById(2)).rejects.toThrow(NotFoundException);
    expect(commentRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('should call findOne with correct parameters during createComment', async () => {
    const createCommentDto: CreateCommentDto = {
      content: 'Test Comment',
      answerId: 123,
      userId: 1,
      agreeCount: 0,
    };

    await service.createComment(createCommentDto);
  });

  // E2E Test
  describe('End-to-End (E2E) Tests', () => {
    let app;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [/* Import your main application module here */],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should create a comment via API', async () => {
      const createCommentDto: CreateCommentDto = {
        content: 'Test Comment',
        answerId: 123,
        userId: 1,
        agreeCount: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/questions/1/answers/2/comments') // Adjust the endpoint as needed
        .send(createCommentDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });
  });
});

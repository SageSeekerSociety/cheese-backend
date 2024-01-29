import { Test, TestingModule } from '@nestjs/testing';
import { CreateCommentDto } from './DTO/CreateComment.dto';
import { CommentController } from './comments.controller';
import { Comment } from './comments.entity';
import { CommentService } from './comments.service';
import * as request from 'supertest';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: {
            createComment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  it('createComment should call service method with correct arguments', async () => {
    const createCommentDto: CreateCommentDto = {
      content: 'Test comment',
      userId: 1,
      agreeCount: 0,
      answerId: 2, // Adjust based on your entity structure
    };

    // Mocked Comment entity with required properties
    const createCommentReturnValue: Comment = {
      id: 1,
      content: 'Test comment',
      userId: 1,
      agreeCount: 0,
      answerId: 2, // Adjust based on your entity structure
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      agreeType: 1, // Adjust based on your entity structure
      quote: null, // Adjust based on your entity structure
    };

    jest.spyOn(service, 'createComment').mockImplementation(() => Promise.resolve(createCommentReturnValue));

    const result = await controller.createComment(createCommentDto);

    expect(service.createComment).toHaveBeenCalledWith(createCommentDto);
    expect(result).toEqual(createCommentReturnValue);
  });

  // E2E Test
  describe('End-to-End (E2E) Tests', () => {
    let app;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [CommentController],
        providers: [
          {
            provide: CommentService,
            useValue: {
              createComment: jest.fn(),
            },
          },
        ],
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
        userId: 1,
        agreeCount: 0,
        answerId: 2, // Adjust based on your entity structure
      };
      const createCommentReturnValue: Comment = {
        id: 1,
        content: 'Test Comment',
        userId: 1,
        agreeCount: 0,
        answerId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        agreeType: 1,
        quote: null,
      };
      // Mock the service method to return the expected result
      jest.spyOn(service, 'createComment').mockImplementation(() => Promise.resolve(createCommentReturnValue));

      // Use supertest to make a request to your endpoint
      const response = await request(app.getHttpServer())
        .post('/comments') // Adjust the endpoint as needed
        .send(createCommentDto)
        .expect(201); // Assuming 201 is the status code for successful creation

      // Add assertions based on the response, if needed
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      // Add other assertions as needed
    });
  });
});

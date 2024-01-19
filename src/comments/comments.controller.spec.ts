import { Test, TestingModule } from '@nestjs/testing';
import { CreateCommentDto } from './DTO/CreateComment.dto';
import { CommentController } from './comments.controller';
import { Comment } from './comments.entity'; // Import the Comment entity
import { CommentService } from './comments.service';

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
      authorId: 1,
      agreeCount: 0,
    };

    // Mocked Comment entity with required properties
    const createCommentReturnValue: Comment = {
      id: 1,
      content: 'Test comment',
      authorId: 1,
      agreeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    jest.spyOn(service, 'createComment').mockImplementation(() => Promise.resolve(createCommentReturnValue));

    const result = await controller.createComment(createCommentDto);

    expect(service.createComment).toHaveBeenCalledWith(createCommentDto);
    expect(result).toEqual(createCommentReturnValue);
  });
});

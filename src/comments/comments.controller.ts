import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { CommentService } from './comments.service';
import { CreateCommentDto } from './DTO/CreateComment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  createComment(@Body() createCommentDto: CreateCommentDto) {
    return this.commentService.createComment(createCommentDto);
  }

  @Get(':id')
  getCommentById(@Param('id') id: number) {
    return this.commentService.getCommentById(id);
  }

  @Get(':id/detail')
  getCommentDetail(@Param('id') id: number) {
    return this.commentService.getCommentDetail(id);
  }

  @Delete(':id')
  deleteComment(@Param('id') id: number) {
    return this.commentService.deleteComment(id);
  }

  @Post(':id/agree')
  agreeComment(@Param('id') id: number) {
    return this.commentService.agreeComment(id);
  }

  @Post(':id/answer')
  commentAnswer(@Param('id') id: number, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.commentAnswer(id, createCommentDto);
  }
}

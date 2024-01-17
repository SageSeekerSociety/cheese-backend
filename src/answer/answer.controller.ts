import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Controller('answer')
export class AnswerController {
    constructor(private readonly answerService: AnswerService) {}

  @Post()
  create(@Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.create(createAnswerDto);
  }

  @Get('question/:questionId/answers')
  getAnswersByQuestionId(
    @Param('questionId') questionId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('sortBy') sortBy: string
  ) {
        return this.answerService.getAnswersByQuestionId(questionId, page, limit, sortBy);
  }
  
//   @Post(':answerId/like')
//   likeAnswer(@Param('answerId') answerId: string, @Body('userId') userId: string) {
//     return this.answerService.likeAnswer(answerId, userId);
//   }

//   @Post(':answerId/favorite')
//   favoriteAnswer(@Param('answerId') answerId: string, @Body('userId') userId: string) {
//     return this.answerService.favoriteAnswer(answerId, userId);
//   }

//   @Post(':answerId/comment')
//   commentOnAnswer(
//     @Param('answerId') answerId: string,
//     @Body('comment') comment: string,
//     @Body('userId') userId: string
//   ) {
//     return this.answerService.commentOnAnswer(answerId, comment, userId);
//   }

  @Put(':id')
  updateAnswer(@Param('id') id: string, @Body() updateAnswerDto: UpdateAnswerDto) {
        return this.answerService.updateAnswer(id, updateAnswerDto);
  }

  @Delete(':id')
  deleteAnswer(@Param('id') id: string) {
        return this.answerService.deleteAnswer(id);
  }

}

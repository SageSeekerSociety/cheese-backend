import { Body, Controller, Delete, Get, Param, Post, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateAnswerDto } from './DTO/create-answer.dto';
import { UpdateAnswerDto } from './DTO/update-answer.dto';
import { AnswerService } from './answer.service';

@Controller('answers')
@UsePipes(new ValidationPipe())
export class AnswerController {
    constructor(private readonly answerService: AnswerService) {}

  @Post()
  create(@Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.create(createAnswerDto);
  }

  @Get('question/:questionId/answers')
  getAnswersByQuestionId(
    @Param('questionId') questionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string
  ) {
        return this.answerService.getAnswersByQuestionId(questionId, page, limit, sortBy);
  }

  @Post(':answerId/agree')
  likeAnswer(@Param('answerId') answerId: number, @Body('userId') userId: string) {
    return this.answerService.agreeAnswer(answerId, userId);
  }

  @Post(':answerId/favorite')
  favoriteAnswer(@Param('answerId') answerId: number, @Body('userId') userId: string) {
    return this.answerService.favoriteAnswer(answerId, userId);
  }

//   @Post(':answerId/comment')
//   commentOnAnswer(
//     @Param('answerId') answerId: string,
//     @Body('comment') comment: string,
//     @Body('userId') userId: string
//   ) {
//     return this.answerService.commentOnAnswer(answerId, comment, userId);
//   }

  @Put(':id')
  updateAnswer(@Param('id') id: number, @Body() updateAnswerDto: UpdateAnswerDto) {
        return this.answerService.updateAnswer(id, updateAnswerDto);
  }

  @Delete(':id')
  deleteAnswer(@Param('id') id: number) {
        return this.answerService.deleteAnswer(id);
  }

}

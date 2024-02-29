/*
 *  Description: This file implements the topics controller.
 *               It is responsible for handling the requests to /topics/...
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { AddTopicRequestDto, AddTopicResponseDto } from './DTO/add-topic.dto';
import { SearchTopicResponseDto } from './DTO/search-topic.dto';
import { TopicsService } from './topics.service';
import { GetTopicResponseDto } from './DTO/get-topic.dto';

@Controller('/topics')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  async searchTopics(
    @Query('q') q: string,
    @Query('page_start', new ParseIntPipe({ optional: true }))
    pageStart: number,
    @Query('page_size', new ParseIntPipe({ optional: true }))
    pageSize: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchTopicResponseDto> {
    if (pageSize == undefined || pageSize == 0) pageSize = 20;
    if (q == undefined) q = '';
    // try get viewer id
    let searcherId: number | undefined;
    try {
      searcherId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
    const [topics, pageRespond] = await this.topicsService.searchTopics(
      q,
      pageStart,
      pageSize,
      searcherId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'OK',
      data: {
        topics: topics,
        page: pageRespond,
      },
    };
  }

  @Post('/')
  async addTopic(
    @Body() request: AddTopicRequestDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<AddTopicResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'topics',
      undefined,
    );
    const topic = await this.topicsService.addTopic(request.name, userId);
    return {
      code: 201,
      message: 'OK',
      data: {
        id: topic.id,
      },
    };
  }

  @Get('/:id')
  async getTopic(
    @Param('id', new ParseIntPipe()) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetTopicResponseDto> {
    let userId: number | undefined;
    try {
      userId = this.authService.verify(auth).userId;
    } catch {
      /* eslint-disable-line no-empty */
    }
    const topic = await this.topicsService.getTopicDtoById(
      id,
      userId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'OK',
      data: {
        topic,
      },
    };
  }
}

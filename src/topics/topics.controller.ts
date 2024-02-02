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
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { unescape } from 'querystring';
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { AddTopicRequestDto, AddTopicResponseDto } from './DTO/add-topic.dto';
import { SearchTopicResponseDto } from './DTO/search-topic.dto';
import { TopicsService } from './topics.service';

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
    @Headers('Authorization') auth: string,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchTopicResponseDto> {
    if (pageSize == null || pageSize == 0) pageSize = 20;
    // try get viewer id
    let searcherId: number = null;
    try {
      searcherId = this.authService.verify(auth).userId;
    } catch {
      // the user is not logged in
    }
    const [topics, pageRespond] = await this.topicsService.searchTopics(
      unescape(q),
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
    @Headers('Authorization') auth: string,
  ): Promise<AddTopicResponseDto> {
    const userId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      userId,
      'topics',
      null,
    );
    const topic = await this.topicsService.addTopic(request.name, userId);
    return {
      code: 201,
      message: 'OK',
      data: topic,
    };
  }
}

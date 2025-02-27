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
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PageWithKeywordDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { AddTopicRequestDto, AddTopicResponseDto } from './DTO/add-topic.dto';
import { GetTopicResponseDto } from './DTO/get-topic.dto';
import { SearchTopicResponseDto } from './DTO/search-topic.dto';
import { TopicsService } from './topics.service';
import { UserId } from '../auth/user-id.decorator';
import { AuthToken, Guard, ResourceId } from '../auth/guard.decorator';

@Controller('/topics')
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  @Guard('enumerate', 'topic')
  async searchTopics(
    @Query()
    { q, page_start: pageStart, page_size: pageSize }: PageWithKeywordDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() searcherId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchTopicResponseDto> {
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
  @Guard('create', 'topic')
  async addTopic(
    @Body() { name }: AddTopicRequestDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<AddTopicResponseDto> {
    const topic = await this.topicsService.addTopic(name, userId);
    return {
      code: 201,
      message: 'OK',
      data: {
        id: topic.id,
      },
    };
  }

  @Get('/:id')
  @Guard('query', 'topic')
  async getTopic(
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId() userId: number | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<GetTopicResponseDto> {
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

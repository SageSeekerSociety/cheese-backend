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
import { AuthService, AuthorizedAction } from '../auth/auth.service';
import { PageWithKeywordDto } from '../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { AddTopicRequestDto, AddTopicResponseDto } from './DTO/add-topic.dto';
import { GetTopicResponseDto } from './DTO/get-topic.dto';
import { SearchTopicResponseDto } from './DTO/search-topic.dto';
import { TopicsService } from './topics.service';

@Controller('/topics')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  async searchTopics(
    @Query()
    { q, page_start: pageStart, page_size: pageSize }: PageWithKeywordDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<SearchTopicResponseDto> {
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

/*
 *  Description: This file implements the AttachmentsController class,
 *               which is responsible for handling the requests to /attachments/...
 *
 *  Author(s):
 *      nameisyui
 *
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { attachmentTypeDto } from './DTO/attachments.dto';
import { getAttachmentResponseDto } from './DTO/get-attachment.dto';
import { uploadAttachmentDto } from './DTO/upload-attachment.dto';
import { AttachmentsService } from './attachments.service';
import { AuthToken, Guard } from '../auth/guard.decorator';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @Guard('create', 'attachment')
  async uploadAttachment(
    @Body() { type }: attachmentTypeDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<uploadAttachmentDto> {
    const attachmentId = await this.attachmentsService.uploadAttachment(
      type,
      file,
    );
    return {
      code: 201,
      message: 'Attachment uploaded successfully',
      data: {
        id: attachmentId,
      },
    };
  }

  @Get('/:attachmentId')
  @Guard('query', 'attachment')
  async getAttachmentDetail(
    @Param('attachmentId', ParseIntPipe) id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<getAttachmentResponseDto> {
    const attachment = await this.attachmentsService.getAttachment(id);
    return {
      code: 200,
      message: 'Get Attachment successfully',
      data: {
        attachment,
      },
    };
  }
}

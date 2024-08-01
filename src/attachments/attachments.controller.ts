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
import { AuthorizedAction } from '../auth/definitions';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { attachmentTypeDto } from './DTO/attachments.dto';
import { getAttachmentResponseDto } from './DTO/get-attachment.dto';
import { uploadAttachmentDto } from './DTO/upload-attachment.dto';
import { AttachmentsService } from './attachments.service';
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Body() { type }: attachmentTypeDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<uploadAttachmentDto> {
    const uploaderId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      uploaderId,
      'attachment',
      undefined,
    );
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
  async getAttachmentDetail(
    @Param('attachmentId', ParseIntPipe) id: number,
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

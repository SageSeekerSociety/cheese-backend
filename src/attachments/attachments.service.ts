/*
 *  Description: This file implements the AttachmentsService class,
 *               which is responsible for handling the business logic of attachments
 *
 *  Author(s):
 *      nameisyui
 *
 */

import { Injectable } from '@nestjs/common';
import { MaterialsService } from '../materials/materials.service';
import { AttachmentType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { attachmentDto } from './DTO/attachments.dto';
import { AttachmentNotFoundError } from './attachments.error';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly materialsService: MaterialsService,
  ) {}

  async uploadAttachment(
    type: AttachmentType,
    file: Express.Multer.File,
  ): Promise<number> {
    const meta = await this.materialsService.getMeta(type, file);
    const newAttachment = await this.prismaService.attachment.create({
      data: {
        url: `/static/${encodeURIComponent(type)}s/${encodeURIComponent(file.filename)}`,
        type,
        meta,
      },
    });
    return newAttachment.id;
  }

  async getAttachment(id: number): Promise<attachmentDto> {
    const attachment = await this.prismaService.attachment.findUnique({
      where: {
        id,
      },
    });
    if (attachment == null) {
      throw new AttachmentNotFoundError(id);
    }
    return attachment;
  }
}

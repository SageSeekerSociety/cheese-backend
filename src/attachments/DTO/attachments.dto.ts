import { AttachmentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class attachmentTypeDto {
  @IsEnum(AttachmentType)
  type: AttachmentType;
}

export class attachmentDto {
  id: number;
  type: string;
  url: string;
  meta: PrismaJson.metaType;
}

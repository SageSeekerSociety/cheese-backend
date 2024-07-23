/*
 *  Description: This file defines the attachments module
 *
 *  Author(s):
 *      nameisyui
 *
 */

import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { InvalidAttachmentTypeError } from './attachments.error';
import { MimeTypeNotMatchError } from '../materials/materials.error';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MaterialsModule } from '../materials/materials.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [configureMulterModule(), PrismaModule, MaterialsModule, AuthModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
function configureMulterModule() {
  return MulterModule.register({
    storage: diskStorage({
      destination: (req, file, callback) => {
        if (!process.env.FILE_UPLOAD_PATH) {
          /* istanbul ignore next */
          throw new Error(
            'FILE_UPLOAD_PATH environment variable is not defined',
          );
        }
        const rootPath = process.env.FILE_UPLOAD_PATH;
        const uploadPaths: { [key: string]: string } = {
          image: join(rootPath, '/images'),
          video: join(rootPath, '/videos'),
          audio: join(rootPath, '/audios'),
          file: join(rootPath, '/files'),
        };
        const fileType = req.body.type;
        const uploadPath = uploadPaths[fileType];
        /* istanbul ignore if */
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const randomName = uuidv4();
        callback(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 1024 * 1024 * 1024, //1GB
    },
    fileFilter(req, file, callback) {
      const typeToMimeTypes: { [key: string]: string[] } = {
        image: ['image'],
        video: ['video'],
        audio: ['audio'],
        file: ['application', 'text'],
      };
      const allowedTypes = typeToMimeTypes[req.body.type];
      if (!allowedTypes) {
        return callback(new InvalidAttachmentTypeError(), false);
      }
      const isAllowed = allowedTypes.some((type) =>
        file.mimetype.includes(type),
      );
      if (!isAllowed) {
        return callback(
          new MimeTypeNotMatchError(file.mimetype, req.body.type),
          false,
        );
      }
      callback(null, true);
    },
  });
}

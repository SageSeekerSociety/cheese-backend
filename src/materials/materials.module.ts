import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MaterialsController } from './materials.controller';
import {
  InvalidMaterialTypeError,
  MimeTypeNotMatchError,
} from './materials.error';
import { MaterialsService } from './materials.service';
@Module({
  imports: [configureMulterModule(), PrismaModule, AuthModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}

function configureMulterModule() {
  return MulterModule.register({
    storage: diskStorage({
      destination: (req, file, callback) => {
        if (!process.env.FILE_UPLOAD_PATH) {
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
        if (!uploadPath) {
          throw new InvalidMaterialTypeError();
        }
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
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
        return callback(new InvalidMaterialTypeError(), false);
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
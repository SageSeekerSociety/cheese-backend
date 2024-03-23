import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadPaths: { [key: string]: string } = {
            image: './uploads/images',
            video: './uploads/videos',
            audio: './uploads/audios',
            file: './uploads/files',
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
          /*const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');*/
          const randomName = uuidv4();
          return callback(null, `${randomName}${extname(file.originalname)}`);
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
          throw new InvalidMaterialTypeError();
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
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}

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
          let uploadPath: string;
          switch (req.body.type) {
            case 'image':
              uploadPath = './uploads/images';
              break;
            case 'video':
              uploadPath = './uploads/videos';
              break;
            case 'audio':
              uploadPath = './uploads/audios';
              break;
            case 'file':
              uploadPath = './uploads/files';
              break;
            default:
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
        switch (req.body.type) {
          case 'image':
            if (!file.mimetype.includes('image')) {
              return callback(
                new MimeTypeNotMatchError(file.mimetype, req.body.type),
                false,
              );
            }
            break;
          case 'video':
            if (!file.mimetype.includes('video')) {
              return callback(
                new MimeTypeNotMatchError(file.mimetype, req.body.type),
                false,
              );
            }
            break;
          case 'audio':
            if (!file.mimetype.includes('audio')) {
              return callback(
                new MimeTypeNotMatchError(file.mimetype, req.body.type),
                false,
              );
            }
            break;
          case 'file':
            if (
              !file.mimetype.includes('application') &&
              !file.mimetype.includes('text')
            ) {
              return callback(
                new MimeTypeNotMatchError(file.mimetype, req.body.type),
                false,
              );
            }
            break;
          default:
            throw new InvalidMaterialTypeError();
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

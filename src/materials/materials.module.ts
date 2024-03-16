import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MaterialsController } from './materials.controller';
import { InvalidMaterialTypeError } from './materials.error';
import { MaterialsService } from './materials.service';
import * as fs from 'fs';
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
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}

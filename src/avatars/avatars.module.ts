import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from '../auth/auth.module';
import { AvatarsController } from './avatars.controller';
import { Avatar } from './avatars.legacy.entity';
import { AvatarsService } from './avatars.service';
import { existsSync, mkdirSync } from 'fs';
@Module({
  imports: [
    TypeOrmModule.forFeature([Avatar]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          /* istanbul ignore if */
          if (!process.env.FILE_UPLOAD_PATH) {
            return callback(
              new Error('FILE_UPLOAD_PATH environment variable is not defined'),
              'error',
            );
          }
          const dest = join(process.env.FILE_UPLOAD_PATH, 'avatars');
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          return callback(null, dest);
        },
        filename: (req, file, callback) => {
          const randomName = uuidv4();
          callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
        fieldNameSize: 50,
      },
      fileFilter: (_, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
        ];
        /* istanbul ignore if */
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
    AuthModule,
  ],
  controllers: [AvatarsController],
  providers: [AvatarsService],
  exports: [AvatarsService],
})
export class AvatarsModule {}

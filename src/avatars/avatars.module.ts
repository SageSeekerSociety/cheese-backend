import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthModule } from '../auth/auth.module';
import { AvatarsController } from './avatars.controller';
import { Avatar } from './avatars.legacy.entity';
import { AvatarsService } from './avatars.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Avatar]),
    MulterModule.register({
      storage: diskStorage({
        destination:
          process.env.NODE_ENV === 'test'
            ? join(__dirname, '../../test/uploads/avatars')
            : '/app/uploads/avatars',
        filename: (_, file, callback) => {
          const fileName = `${new Date().getTime() + extname(file.originalname)}`;
          return callback(null, fileName);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
        fieldNameSize: 50,
      },
      fileFilter: (_, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
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

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
        destination: join(__dirname, '/images'),
        filename: (_, file, callback) => {
          const fileName = `${new Date().getTime() + extname(file.originalname)}`;
          return callback(null, fileName);
        },
      }),
      limits: {
        // 限制文件大小为 2 MB
        fileSize: 2 * 1024 * 1024,
        // 限制文件名长度为 50 bytes
        fieldNameSize: 50,
      },
      fileFilter: (_, file, callback) => {
        // 检查文件类型
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
export class AvatarsModule {
  private isValidFileType(file: { originalname: string }): boolean {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExt = extname(file.originalname).toLowerCase();
    return allowedTypes.includes(fileExt);
  }
}

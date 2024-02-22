import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { Avatar } from './avatars.legacy.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
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
    }),
    AuthModule,
  ],
  controllers: [AvatarsController],
  providers: [AvatarsService],
  exports: [AvatarsService],
})
export class AvatarsModule {}

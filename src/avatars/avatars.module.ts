import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from '../auth/auth.module';
import { AvatarsController } from './avatars.controller';
import { InvalidPathError } from './avatars.error';
import { Avatar } from './avatars.legacy.entity';
import { AvatarsService } from './avatars.service';
declare module 'path' {
  interface PlatformPath {
    joinSafe(...paths: string[]): string | undefined;
  }
}
function pathJoinSafePosix(
  dir: string,
  ...paths: string[]
): string | undefined {
  dir = path.posix.normalize(dir);
  const pathname = path.posix.join(dir, ...paths);
  if (pathname.substring(0, dir.length) !== dir) return undefined;
  return pathname;
}

function pathJoinSafeWin32(
  dir: string,
  ...paths: string[]
): string | undefined {
  dir = path.win32.normalize(dir);
  const pathname = path.win32.join(dir, ...paths);
  if (pathname.substring(0, dir.length) !== dir) return undefined;
  return pathname;
}

path.posix.joinSafe = pathJoinSafePosix;
path.win32.joinSafe = pathJoinSafeWin32;

export function pathJoinSafe(
  dir: string,
  ...paths: string[]
): string | undefined {
  dir = path.normalize(dir);
  let joinedPath: string;
  if (path.sep === '/') {
    joinedPath = path.posix.join(dir, ...paths);
  } else {
    joinedPath = path.win32.join(dir, ...paths);
  }

  if (joinedPath.substring(0, dir.length) !== dir) return undefined;
  return joinedPath;
}
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
          const dest = pathJoinSafe(process.env.FILE_UPLOAD_PATH, 'avatars');
          if (!dest) {
            throw new InvalidPathError();
          }
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

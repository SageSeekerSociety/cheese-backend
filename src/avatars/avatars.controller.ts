import {
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarType } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { getFileHash, getFileMimeType } from '../common/helper/file.helper';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { UploadAvatarResponseDto } from './DTO/upload-avatar.dto';
import {
  CorrespondentFileNotExistError,
  InvalidAvatarTypeError,
} from './avatars.error';
import { AvatarsService } from './avatars.service';
import { AuthToken, Guard, ResourceId } from '../auth/guard.decorator';

@Controller('/avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  @Guard('create', 'avatar')
  async createAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<UploadAvatarResponseDto> {
    const avatar = await this.avatarsService.save(file.path, file.filename);
    return {
      code: 201,
      message: 'Upload avatar successfully',
      data: {
        avatarId: avatar.id,
      },
    };
  }

  @Get('/default')
  @Guard('query-default', 'avatar')
  async getDefaultAvatar(
    @Headers('If-None-Match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
    @Headers('Authorization') @AuthToken() auth: string,
  ) {
    const defaultAvatarId = await this.avatarsService.getDefaultAvatarId();
    const avatarPath = await this.avatarsService.getAvatarPath(defaultAvatarId);
    if (!fs.existsSync(avatarPath)) {
      throw new CorrespondentFileNotExistError(defaultAvatarId);
    }

    const fileMimeType = await getFileMimeType(avatarPath);
    const fileHash = await getFileHash(avatarPath);
    const fileStat = fs.statSync(avatarPath);
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': 'inline',
      'Content-Length': fileStat.size,
      'Content-Type': fileMimeType,
      ETag: fileHash,
      'Last-Modified': fileStat.mtime.toUTCString(),
    });
    if (ifNoneMatch === fileHash) {
      res.status(304).end();
      return;
    }

    const file = fs.createReadStream(avatarPath);
    return new StreamableFile(file);
  }

  @Get('/:id')
  @Guard('query', 'avatar')
  async getAvatar(
    @Headers('If-None-Match') ifNoneMatch: string,
    @Param('id', ParseIntPipe) @ResourceId() id: number,
    @Res({ passthrough: true }) res: Response,
    @Headers('Authorization') @AuthToken() auth: string,
  ) {
    const avatarPath = await this.avatarsService.getAvatarPath(id);
    if (!fs.existsSync(avatarPath)) {
      throw new CorrespondentFileNotExistError(id);
    }

    const fileMimeType = await getFileMimeType(avatarPath);
    const fileHash = await getFileHash(avatarPath);
    const fileStat = fs.statSync(avatarPath);
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': 'inline',
      'Content-Length': fileStat.size,
      'Content-Type': fileMimeType,
      ETag: fileHash,
      'Last-Modified': fileStat.mtime.toUTCString(),
    });
    if (ifNoneMatch === fileHash) {
      res.status(304).end();
      return;
    }

    const file = fs.createReadStream(avatarPath);
    return new StreamableFile(file);
  }

  @Get()
  @Guard('enumerate', 'avatar')
  async getAvailableAvatarIds(
    @Query('type') type: AvatarType = AvatarType.predefined,
    @Headers('Authorization') @AuthToken() auth: string,
  ) {
    if (type == AvatarType.predefined) {
      const avatarIds = await this.avatarsService.getPreDefinedAvatarIds();
      return {
        code: 200,
        message: 'Get available avatarIds successfully',
        data: {
          avatarIds,
        },
      };
    } else throw new InvalidAvatarTypeError(type);
  }
}

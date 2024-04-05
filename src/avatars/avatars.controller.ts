import {
  Controller,
  Get,
  Headers,
  Param,
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
import { Response } from 'express';
import * as fs from 'fs';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { getFileHash, getFileMimeType } from '../common/helper/file.helper';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { UploadAvatarRespondDto } from './DTO/upload-avatar.dto';
import {
  CorrespondentFileNotExistError,
  InvalidAvatarTypeError,
} from './avatars.error';
import { AvatarType } from './avatars.legacy.entity';
import { AvatarsService } from './avatars.service';

@Controller('/avatars')
@UsePipes(ValidationPipe)
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  async createAvatar(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadAvatarRespondDto> {
    //const userid = this.authService.verify(auth).userId;
    const avatar = await this.avatarsService.save(file.path, file.filename);
    return {
      code: 201,
      message: 'Upload avatar successfully',
      data: {
        avatarid: avatar.id,
      },
    };
  }

  @Get('/default')
  async getDefaultAvatar(
    @Headers('If-None-Match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
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
  async getAvatar(
    @Headers('If-None-Match') ifNoneMatch: string,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
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
  async getAvailableAvatarIds(
    @Query('type') type: AvatarType = AvatarType.predefined,
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

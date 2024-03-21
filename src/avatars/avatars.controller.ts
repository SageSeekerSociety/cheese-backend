import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { UploadAvatarRespondDto } from './DTO/upload-avatar.dto';
import { AvatarsService } from './avatars.service';
import path from 'path';
import { CorrespondentFileNotExistError } from './avatars.error';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';

@Controller('/avatars')
@UseFilters(new BaseErrorExceptionFilter())
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
  @Get('/:id')
  async getAvatar(
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const avatarPath = await this.avatarsService.getAvatarPath(id);
    const file = fs.createReadStream(avatarPath);
    if (fs.existsSync(avatarPath)) {
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition':
          'attachment; filename=' + path.parse(avatarPath).base,
      });
      return new StreamableFile(file);
    } else throw new CorrespondentFileNotExistError(id);
  }

  @Get('/default/id')
  async getDefaultAvatarId() {
    const DefaultAvatarId = await this.avatarsService.getDefaultAvatarId();
    return {
      code: 200,
      message: 'Get default avatarIds successfully',
      data: {
        avatarId: DefaultAvatarId,
      },
    };
  }

  @Get('/predefined/id')
  async getPreDefinedAvatarId() {
    const PreDefinedAvatarIds =
      await this.avatarsService.getPreDefinedAvatarIds();
    return {
      code: 200,
      message: 'Get default avatarIds successfully',
      data: {
        avatarIds: PreDefinedAvatarIds,
      },
    };
  }
}

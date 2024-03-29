import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import path from 'path';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { TokenValidateInterceptor } from '../common/interceptor/token-validate.interceptor';
import { UploadAvatarRespondDto } from './DTO/upload-avatar.dto';
import {
  CorrespondentFileNotExistError,
  InvalidAvatarTypeError,
} from './avatars.error';
import { AvatarType } from './avatars.legacy.entity';
import { AvatarsService } from './avatars.service';

@Controller('/avatars')
@UseFilters(BaseErrorExceptionFilter)
@UseInterceptors(TokenValidateInterceptor)
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}
  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  async createAvatar(
    @UploadedFile() { path, filename }: Express.Multer.File,
  ): Promise<UploadAvatarRespondDto> {
    //const userid = this.authService.verify(auth).userId;
    const avatar = await this.avatarsService.save(path, filename);
    return {
      code: 201,
      message: 'Upload avatar successfully',
      data: {
        avatarid: avatar.id,
      },
    };
  }
  @Get('/default')
  async getDefaultAvatar(@Res({ passthrough: true }) res: Response) {
    const DefaultAvatarId = await this.avatarsService.getDefaultAvatarId();
    const avatarPath = await this.avatarsService.getAvatarPath(DefaultAvatarId);
    const file = fs.createReadStream(avatarPath);
    if (fs.existsSync(avatarPath)) {
      res.set({
        'Content-Type': 'image/*',
        'Content-Disposition':
          'attachment; filename=' + path.parse(avatarPath).base,
      });
      return new StreamableFile(file);
    } else throw new CorrespondentFileNotExistError(DefaultAvatarId);
  }
  @Get()
  async getAvailableAvatarIds(
    @Query('type') type: AvatarType = AvatarType.PreDefined,
  ) {
    if (type == AvatarType.PreDefined) {
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
  @Get('/:id')
  async getAvatar(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const avatarPath = await this.avatarsService.getAvatarPath(id);
    const file = fs.createReadStream(avatarPath);
    if (fs.existsSync(avatarPath)) {
      res.set({
        'Content-Type': 'image/*',
        'Content-Disposition':
          'attachment; filename=' + path.parse(avatarPath).base,
      });
      return new StreamableFile(file);
    } else throw new CorrespondentFileNotExistError(id);
  }
}

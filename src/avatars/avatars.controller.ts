import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { UploadAvatarRespondDto } from './DTO/upload-avatar.dto';
import { AvatarsService } from './avatars.service';

@Controller('/avatars')
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
    const avatar = await this.avatarsService.findOne(id);
    const path = __dirname + '//images//' + avatar.name;
    const file = fs.createReadStream(path);
    if (fs.existsSync(path)) {
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=' + avatar.name,
      });
      return new StreamableFile(file);
    } else {
      throw new NotFoundException('Avatar not found');
    }
  }
  @Get('/default/ids')
  async getDefaultAvatarIds() {
    const Ids = await this.avatarsService.getDefaultAvatarIds();
    return {
      code: 200,
      message: 'Get default avatarIds successfully',
      data: {
        avatarIds: Ids,
      },
    };
  }
}

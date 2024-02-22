import {
  Controller,
  Get,
  Headers,
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
import { AuthService } from '../auth/auth.service';
import { AvatarsService } from './avatars.service';
import { UploadVartarRespondDto } from './dto/upload-vartar-response.dto';
@Controller('/avatars')
export class AvatarsController {
  constructor(
    private readonly avatarsService: AvatarsService,
    private readonly authService: AuthService,
  ) {}
  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  async createAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') auth: string,
  ): Promise<UploadVartarRespondDto> {
    const userid = this.authService.verify(auth).userId;
    console.log(userid);
    console.log(file.filename);
    const avatar = await this.avatarsService.save(file.filename, userid);
    return {
      code: 201,
      message: 'Upload avatar successfully',
      avatarid: avatar.id,
    };
  }
  @Get('/:id')
  async getAvatar(
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const avatar = await this.avatarsService.findOne(id);
    const path = __dirname + '\\images\\' + avatar.name;
    const file = fs.createReadStream(path);
    console.log(path);
    if (fs.existsSync(path)) {
      res.set({
        'Content-Type': 'image',
        'Content-Disposition': 'attachment; filename=' + avatar.name,
      });
      return new StreamableFile(file);
    } else {
      throw new NotFoundException('Avatar not found');
    }
  }
}

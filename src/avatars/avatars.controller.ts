import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { AuthService } from '../auth/auth.service';
import { BaseRespondDto } from '../common/DTO/base-respond.dto';
import { AvatarsService } from './avatars.service';

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
  ): Promise<BaseRespondDto> {
    const userid = this.authService.verify(auth).userId;
    console.log(userid);
    console.log(file.filename);
    await this.avatarsService.save(file.filename, userid);
    return {
      code: 201,
      message: 'Upload avatar successfully',
    };
  }
  @Get('/:id')
  async getAvatar(@Param('id') id: number, @Res() res: Response) {
    const filename = await this.avatarsService.findOne(id);
    const path = __dirname + '\\images\\' + filename;

    console.log(path);
    if (fs.existsSync(path)) {
      return res.sendFile(path);
    } else {
      throw new NotFoundException('Avatar not found');
    }
  }
}

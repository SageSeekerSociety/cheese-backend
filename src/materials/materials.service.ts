import { Injectable } from '@nestjs/common';
import { material } from '@prisma/client';
import * as ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseMaterial } from './materials.enum';
import { MaterialNotFoundError, MetaDataParseError } from './materials.error';
@Injectable()
export class MaterialsService {
  constructor(private readonly prismaService: PrismaService) {}
  async getVideoMetadata(
    filePath: string,
  ): Promise<{ width: number; height: number; duration: number }> {
    //ffmpeg.setFfmpegPath('E:/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe');
    //ffmpeg.setFfprobePath('E:/ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe');
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          throw new MetaDataParseError('audio');
        } else {
          const width = metadata.streams[0].width;
          const height = metadata.streams[0].height;
          const duration = metadata.format.duration;
          if (
            width == undefined ||
            height == undefined ||
            duration == undefined
          ) {
            throw new MetaDataParseError('audio');
          }
          resolve({ width, height, duration });
        }
      });
    });
  }
  async getAudioMetadata(filePath: string): Promise<{ duration: number }> {
    //ffmpeg.setFfmpegPath('E:/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe');
    //ffmpeg.setFfprobePath('E:/ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe');
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          throw new MetaDataParseError('audio');
        } else {
          const duration = metadata.format.duration;
          if (duration == undefined) {
            throw new MetaDataParseError('audio');
          }
          resolve({ duration });
        }
      });
    });
  }
  async uploadMaterial(
    type: string,
    file: Express.Multer.File,
  ): Promise<number> {
    let meta;
    if (type === 'image') {
      const image = sharp(file.path);
      const metadata = await image.metadata();
      meta = {
        width: metadata.width,
        height: metadata.height,
        size: file.size,
        thumbnail: 'thumbnail', //todo
      };
    } else if (type === 'video') {
      const metadata = await this.getVideoMetadata(file.path);
      meta = {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        size: file.size,
        thumbnail: 'thumbnail', //todo
      };
    } else if (type === 'audio') {
      const metadata = await this.getAudioMetadata(file.path);
      meta = {
        duration: metadata.duration,
        size: file.size,
      };
    } else {
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        expires: 0, // todo?
      };
    }
    console.log(meta);
    const newMaterial = await this.prismaService.material.create({
      data: {
        url: file.destination,
        type: parseMaterial(type),
        name: file.filename,
        meta,
      },
    });
    return newMaterial.id;
  }

  async getMaterial(id: number): Promise<material> {
    const material = await this.prismaService.material.findUnique({
      where: {
        id,
      },
    });
    if (material == null) {
      throw new MaterialNotFoundError(id);
    }
    return material;
  }
}

import { Injectable } from '@nestjs/common';
import { Material, MaterialType } from '@prisma/client';
import * as ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { PrismaService } from '../common/prisma/prisma.service';
import { MaterialNotFoundError, MetaDataParseError } from './materials.error';
@Injectable()
export class MaterialsService {
  private ffprobeAsync: (file: string) => Promise<ffmpeg.FfprobeData>;
  constructor(private readonly prismaService: PrismaService) {
    try {
      this.ffprobeAsync = promisify(ffmpeg.ffprobe);
    } catch (error) {
      throw new Error('ffmpeg error');
    }
  }
  async getImageMetadata(
    filePath: string,
  ): Promise<{ width: number; height: number }> {
    try {
      const metadata = await this.ffprobeAsync(filePath);
      const width = metadata.streams[0].width;
      const height = metadata.streams[0].height;
      if (width === undefined || height === undefined) {
        throw new MetaDataParseError('image');
      }
      return { width, height };
    } catch (error) {
      throw new MetaDataParseError('image');
    }
  }
  async getVideoMetadata(
    filePath: string,
  ): Promise<{ width: number; height: number; duration: number }> {
    try {
      const metadata = await this.ffprobeAsync(filePath);
      const width = metadata.streams[0].width;
      const height = metadata.streams[0].height;
      const duration = metadata.format.duration;
      if (
        width === undefined ||
        height === undefined ||
        duration === undefined
      ) {
        throw new MetaDataParseError('video');
      }
      return { width, height, duration };
    } catch (error) {
      throw new MetaDataParseError('video');
    }
  }
  async getAudioMetadata(filePath: string): Promise<{ duration: number }> {
    try {
      const metadata = await this.ffprobeAsync(filePath);
      const duration = metadata.format.duration;
      if (duration === undefined) {
        throw new MetaDataParseError('audio');
      }
      return { duration };
    } catch (error) {
      throw new MetaDataParseError('audio');
    }
  }
  async uploadMaterial(
    type: MaterialType,
    file: Express.Multer.File,
  ): Promise<number> {
    let meta;
    if (type === MaterialType.image) {
      const metadata = await this.getImageMetadata(file.path);
      meta = {
        width: metadata.width,
        height: metadata.height,
        size: file.size,
        thumbnail: 'thumbnail', //todo
      };
    } else if (type === MaterialType.video) {
      const metadata = await this.getVideoMetadata(file.path);
      meta = {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        size: file.size,
        thumbnail: 'thumbnail', //todo
      };
    } else if (type === MaterialType.audio) {
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
    const newMaterial = await this.prismaService.material.create({
      data: {
        url: '/static/' + type + 's/' + file.filename, //todo:may need a better way
        type,
        name: file.filename,
        meta,
      },
    });
    return newMaterial.id;
  }

  async getMaterial(id: number, fieldList: string[]): Promise<Material> {
    const material = await this.prismaService.material.findUnique({
      where: {
        id,
      },
      select: {
        id: fieldList.includes('id'),
        url: fieldList.includes('url'),
        type: fieldList.includes('type'),
        name: fieldList.includes('name'),
        meta: fieldList.includes('meta'),
      },
    });
    if (material == null) {
      throw new MaterialNotFoundError(id);
    }
    return material;
  }
}
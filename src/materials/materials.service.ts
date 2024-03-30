import { Injectable, OnModuleInit } from '@nestjs/common';
import { Material, MaterialType } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import path, { join } from 'path';
import { promisify } from 'util';
import { PrismaService } from '../common/prisma/prisma.service';
import { MaterialNotFoundError, MetaDataParseError } from './materials.error';
@Injectable()
export class MaterialsService implements OnModuleInit {
  private ffprobeAsync: (file: string) => Promise<ffmpeg.FfprobeData>;
  constructor(private readonly prismaService: PrismaService) {
    this.ffprobeAsync = promisify(ffmpeg.ffprobe);
  }
  async onModuleInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableCodecs((err) => {
        /* istanbul ignore if */
        if (err) {
          reject(new Error('FFmpeg not found on system.'));
        } else {
          resolve();
        }
      });
    });
  }
  async getImageMetadata(
    filePath: string,
  ): Promise<{ width: number; height: number }> {
    const metadata = await this.ffprobeAsync(filePath);
    const width = metadata.streams[0].width;
    const height = metadata.streams[0].height;
    /* istanbul ignore if */
    if (!width || !height) {
      throw new MetaDataParseError('image');
    }
    return { width, height };
  }
  async getVideoMetadata(filePath: string): Promise<{
    width: number;
    height: number;
    duration: number;
    thumbnail: string;
  }> {
    const metadata = await this.ffprobeAsync(filePath);
    const width = metadata.streams[0].width;
    const height = metadata.streams[0].height;
    const duration = metadata.format.duration;
    /* istanbul ignore if */
    if (!width || !height || !duration) {
      throw new MetaDataParseError('video');
    }
    const rootPath = process.env.FILE_UPLOAD_PATH!;
    const videoName = path.parse(filePath).name;
    ffmpeg(filePath)
      .screenshots({
        timestamps: ['00:00:01'],
        folder: join(rootPath, '/images'),
        filename: `${videoName}-thumbnail.jpg`,
        size: '320x240',
      })

      .on('end', () => {
        /* istanbul ignore next */
      })
      .on('error', (err: Error) => {
        /* istanbul ignore next */
        throw Error('Error generating thumbnail:' + err);
      });
    const thumbnail = `/static/images/${encodeURIComponent(videoName)}-thumbnail.jpg`;
    return { width, height, duration, thumbnail };
  }
  async getAudioMetadata(filePath: string): Promise<{ duration: number }> {
    const metadata = await this.ffprobeAsync(filePath);
    const duration = metadata.format.duration;
    /* istanbul ignore if */
    if (!duration) {
      throw new MetaDataParseError('audio');
    }
    return { duration };
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
        thumbnail: metadata.thumbnail, //todo
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
        url: `/static/${encodeURIComponent(type)}s/${encodeURIComponent(file.filename)}`,
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

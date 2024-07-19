import { Injectable, OnModuleInit } from '@nestjs/common';
import { MaterialType } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import path, { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { PrismaService } from '../common/prisma/prisma.service';
import { MaterialNotFoundError, MetaDataParseError } from './materials.error';
import { materialDto } from './DTO/material.dto';
import { UsersService } from '../users/users.service';
import md5 from 'md5';
@Injectable()
export class MaterialsService implements OnModuleInit {
  private ffprobeAsync: (file: string) => Promise<ffmpeg.FfprobeData>;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UsersService,
  ) {
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

  async getMeta(
    type: string,
    file: Express.Multer.File,
  ): Promise<PrismaJson.metaType> {
    let meta: PrismaJson.metaType;

    const buf = readFileSync(file.path);
    const hash = md5(buf);

    if (type === MaterialType.image) {
      const metadata = await this.getImageMetadata(file.path);
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        hash,
        width: metadata.width,
        height: metadata.height,
        thumbnail: 'thumbnail', //todo
      };
    } else if (type === MaterialType.video) {
      const metadata = await this.getVideoMetadata(file.path);
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        hash,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        thumbnail: metadata.thumbnail, //todo
      };
    } else if (type === MaterialType.audio) {
      const metadata = await this.getAudioMetadata(file.path);
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        hash,
        duration: metadata.duration,
      };
    } else {
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        hash,
      };
    }
    return meta;
  }

  async uploadMaterial(
    type: MaterialType,
    file: Express.Multer.File,
    uploaderId: number,
  ): Promise<number> {
    const meta = await this.getMeta(type, file);
    const newMaterial = await this.prismaService.material.create({
      data: {
        url: `/static/${encodeURIComponent(type)}s/${encodeURIComponent(file.filename)}`,
        type,
        name: file.filename,
        uploaderId,
        meta,
      },
    });
    return newMaterial.id;
  }

  async getMaterial(
    materialId: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<materialDto> {
    const material = await this.prismaService.material.findUnique({
      where: {
        id: materialId,
      },
    });
    if (material == null) {
      throw new MaterialNotFoundError(materialId);
    }
    const uploaderDto = await this.userService.getUserDtoById(
      material.uploaderId,
      viewerId,
      ip,
      userAgent,
    );
    const expires = material.expires == null ? undefined : material.expires;
    return {
      id: material.id,
      type: material.type,
      uploader: uploaderDto,
      created_at: material.createdAt.getTime(),
      expires,
      download_count: material.downloadCount,
      url: material.url,
      meta: material.meta,
    };
  }
}

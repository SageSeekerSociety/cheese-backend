import { Injectable } from '@nestjs/common';
import { material } from '@prisma/client';
import sharp from 'sharp';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseMaterial } from './materials.enum';
import { MaterialNotFoundError } from './materials.error';
@Injectable()
export class MaterialsService {
  constructor(private readonly prismaService: PrismaService) {}
  async uploadMaterial(
    type: string,
    file: Express.Multer.File,
  ): Promise<number> {
    let meta;
    if (type === 'image') {
      console.log(1);
      const image = sharp(file.path);
      const metadata = await image.metadata();
      meta = {
        width: metadata.width,
        height: metadata.height,
        size: file.size,
        thumbnail: 'url',
      };
      console.log(meta);
    } else if (type === 'video') {
      meta = {
        width: 0,
        height: 0,
        size: file.size,
        duration: 1,
        thumbnail: 'url',
      };
    } else if (type === 'audio') {
      meta = {
        size: file.size,
        duration: 0,
      };
    } else {
      meta = {
        size: file.size,
        name: file.filename,
        mime: file.mimetype,
        expires: 0,
      };
    }
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

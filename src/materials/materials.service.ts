import { Injectable } from '@nestjs/common';
import { material } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseMaterial } from './materials.enum';
import { MaterialNotFoundError } from './materials.error';

@Injectable()
export class MaterialsService {
  constructor(private readonly prismaService: PrismaService) {}
  async uploadMaterial(
    type: string,
    url: string,
    name: string,
  ): Promise<number> {
    let meta;
    if (type === 'image') {
      meta = {
        width: 0,
        height: 0,
        size: 0,
        thumbnail: 'url',
      };
    } else if (type === 'video') {
      meta = {
        width: 0,
        height: 0,
        size: 0,
        duration: 1,
        thumbnail: 'url',
      };
    } else if (type === 'audio') {
      meta = {
        size: 0,
        duration: 0,
      };
    } else {
      meta = {
        size: 0,
        name,
        mime: 'mime',
        expires: 0,
      };
    }
    const newMaterial = await this.prismaService.material.create({
      data: {
        url,
        type: parseMaterial(type),
        name,
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

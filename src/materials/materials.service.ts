import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseMaterial } from './materials.enum';
import { MaterialNotFoundError } from './materials.error';
import { MaterialType } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private readonly prismaService: PrismaService) {}
  async uploadMaterial(
    type: string,
    url: string,
    name: string,
  ): Promise<number> {
    if (type === 'image') {
      const imageMeta = await this.prismaService.imageMeta.create({
        data: {
          width: 0,
          height: 0,
          size: 0,
          thumbnail: 'url',
        },
      });
      const newMaterial = await this.prismaService.material.create({
        data: {
          url,
          type: parseMaterial(type),
          name,
          imageMetaId: imageMeta.id,
        },
      });
      return newMaterial.id;
    } else if (type === 'video') {
      const videoMeta = await this.prismaService.videoMeta.create({
        data: {
          width: 0,
          height: 0,
          size: 0,
          duration: 1,
          thumbnail: 'url',
        },
      });
      const newMaterial = await this.prismaService.material.create({
        data: {
          url,
          type: parseMaterial(type),
          name,
          videoMetaId: videoMeta.id,
        },
      });
      return newMaterial.id;
    } else {
      const fileMeta = await this.prismaService.fileMeta.create({
        data: {
          size: 0,
          name,
          mime: 'mime',
          expires: 0,
        },
      });
      const newMaterial = await this.prismaService.material.create({
        data: {
          url,
          type: parseMaterial(type),
          name,
          fileMetaId: fileMeta.id,
        },
      });
      return newMaterial.id;
    }
  }

  async getMaterial(id: number) {
    const material = await this.prismaService.material.findUnique({
      where: {
        id,
      },
    });
    if (material == null) throw new MaterialNotFoundError(id);
    if (material.type == MaterialType.IMAGE) {
      const imageMetaId = material.imageMetaId;
      if (imageMetaId == null) throw new Error();
      const meta = await this.prismaService.imageMeta.findUnique({
        where: {
          id: imageMetaId,
        },
      });
      if (meta == null) throw new Error();
      return { material, meta };
    } else if (material.type == MaterialType.VIDEO) {
      const videoMetaId = material.videoMetaId;
      if (videoMetaId == null) throw new Error();
      const meta = await this.prismaService.videoMeta.findUnique({
        where: {
          id: videoMetaId,
        },
      });
      if (meta == null) throw new Error();
      return { material, meta };
    }
    // else if(material.type==MaterialType.FILE){
    else {
      const fileMetaId = material.fileMetaId;
      if (fileMetaId == null) throw new Error();
      const meta = await this.prismaService.fileMeta.findUnique({
        where: {
          id: fileMetaId,
        },
      });
      if (meta == null) throw new Error();
      return { material, meta };
    }
  }
}

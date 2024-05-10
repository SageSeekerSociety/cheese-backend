import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { materialBundleDto } from './DTO/materialbundle.dto';
import { UserDto } from '../users/DTO/user.dto';
import { UsersService } from '../users/users.service';
import { MaterialsService } from '../materials/materials.service';
import { MaterialNotFoundError } from '../materials/materials.error';
import {
  BundleNotFoundError,
  DeleteBundleDeniedError,
  UpdateBundleDeniedError,
} from './materialbundles.error';

@Injectable()
export class MaterialbundlesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly materialsService: MaterialsService,
  ) {}

  async createBundle(
    title: string,
    content: string,
    materialIds: number[],
    creatorId: number,
  ): Promise<number> {
    for (const i in materialIds) {
      const material = await this.prismaService.material.findUnique({
        where: {
          id: materialIds[i],
        },
      });
      if (!material) {
        throw new MaterialNotFoundError(materialIds[i]);
      }
    }
    const materialBundleCreateArray = materialIds.map((materialId) => ({
      material: {
        connect: {
          id: materialId,
        },
      },
    }));
    const newBundle = await this.prismaService.materialBundle.create({
      data: {
        title,
        content,
        creatorId,
        materials: {
          create: materialBundleCreateArray,
        },
      },
    });
    return newBundle.id;
  }
  /*async getBundles(
    keywords: string,
    pageStart: number | undefined, // if from start
    pageSize: number,
    sortRule: string,
    searcherId?: number, // optional
    ip?: string, // optional
    userAgent?: string, // optional
  ) {

    await this.prismaService.materialBundle.findMany({

    })
  }*/

  async getBundleDetail(bundleId: number): Promise<materialBundleDto> {
    const bundle = await this.prismaService.materialBundle.findUnique({
      where: {
        id: bundleId,
      },
    });
    if (!bundle) {
      throw new BundleNotFoundError(bundleId);
    }
    let userDto: UserDto | null = null; // For case that user is deleted.
    try {
      userDto = await this.usersService.getUserDtoById(bundle.creatorId);
    } catch (e) {
      // If user is null, it means that one user created this question, but the user
      // does not exist now. This is NOT a data integrity problem, since user can be
      // deleted. So we just return a null and not throw an error.
    }
    const materialIds = (
      await this.prismaService.materialbundlesRelation.findMany({
        where: {
          bundleId: bundle.id,
        },
      })
    ).map((i) => i.materialId);
    const materialDtos = await Promise.all(
      materialIds.map((id) => this.materialsService.getMaterial(id)),
    );
    const myRating = bundle.myRating == null ? undefined : bundle.myRating;
    return {
      id: bundle.id,
      title: bundle.title,
      content: bundle.content,
      creator: userDto,
      created_at: bundle.createdAt.getTime(),
      updated_at: bundle.updatedAt.getTime(),
      rating: bundle.rating,
      rating_count: bundle.ratingCount,
      my_rating: myRating,
      comments_count: bundle.commentsCount,
      materials: materialDtos,
    };
  }
  async updateMaterialBundle(
    bundleId: number,
    userId: number,
    title: string | undefined,
    content: string | undefined,
    materials: number[] | undefined,
  ) {
    const bundle = await this.prismaService.materialBundle.findUnique({
      where: {
        id: bundleId,
      },
      include: {
        materials: true,
      },
    });
    if (!bundle) throw new BundleNotFoundError(bundleId);
    if (bundle.creatorId != userId) throw new UpdateBundleDeniedError(bundleId);
    const data: any = {};
    if (title !== undefined) {
      data.title = title;
    }
    if (content !== undefined) {
      data.content = content;
    }
    if (materials !== undefined) {
      for (const materialId of materials) {
        const material = await this.prismaService.material.findUnique({
          where: { id: materialId },
        });
        if (!material) {
          throw new MaterialNotFoundError(materialId);
        }
      }
      await this.prismaService.$transaction(async () => {
        const currentMaterialIds = bundle.materials.map((i) => i.materialId);
        const materialIdsToAdd = materials.filter(
          (id) => !currentMaterialIds.includes(id),
        );
        const materialIdsToRemove = currentMaterialIds.filter(
          (id) => !materials.includes(id),
        );
        if (materialIdsToRemove.length > 0) {
          // delete if not exist in updated bundle
          await this.prismaService.materialbundlesRelation.deleteMany({
            where: {
              bundleId: bundleId,
              materialId: { in: materialIdsToRemove },
            },
          });
        }
        // add new
        if (materialIdsToAdd.length > 0) {
          // 添加新的材料
          data.materials = {
            create: materialIdsToAdd.map((id) => ({
              material: {
                connect: { id },
              },
            })),
          };
        }
        await this.prismaService.materialBundle.update({
          where: { id: bundleId },
          data: data,
        });
      });
    }
  }
  async deleteMaterialBundle(id: number, userId: number) {
    const bundle = await this.prismaService.materialBundle.findUnique({
      where: {
        id,
      },
    });
    if (!bundle) throw new BundleNotFoundError(id);
    if (bundle.creatorId != userId) throw new DeleteBundleDeniedError(id);
    await this.prismaService.materialBundle.delete({
      where: {
        id,
      },
    });
    return;
  }
}

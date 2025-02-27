/*
 *  Description: This file implements the MaterialbundlesService class,
 *               which is responsible for handling the business logic of material bundles
 *
 *  Author(s):
 *      nameisyui
 *
 */

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
  KeywordTooLongError,
} from './materialbundles.error';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { Prisma } from '@prisma/client';
import {
  getPrevWhereBySort,
  getCurrWhereBySort,
} from '../common/helper/where.helper';
import { SortPattern } from '../common/pipe/parse-sort-pattern.pipe';

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
  async getBundles(
    keywords: string,
    firstBundleId: number | undefined, // if from start
    pageSize: number,
    sort: string,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[materialBundleDto[], PageDto]> {
    if (keywords.length > 100) throw new KeywordTooLongError();
    const take = pageSize + 1;
    let sortPattern: SortPattern;
    if (sort === 'rating') {
      sortPattern = { rating: 'desc' };
    } else if (sort === 'download') {
      //to do
      sortPattern = { downloads: 'desc' };
    } else if (sort === 'newest') {
      sortPattern = { createdAt: 'desc' };
    } else {
      sortPattern = { id: 'asc' };
    }
    if (firstBundleId == undefined) {
      const bundles = await this.prismaService.materialBundle.findMany({
        take,
        where: {
          ...this.buildWhereCondition(keywords),
        },
        orderBy: sortPattern,
      });
      const DTOs = await Promise.all(
        bundles.map((r) => {
          return this.getBundleDetail(r.id, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (i) => i.id);
    } else {
      const cursor = await this.prismaService.materialBundle.findUnique({
        where: { id: firstBundleId },
      });
      if (cursor == undefined) {
        throw new BundleNotFoundError(firstBundleId);
      }
      const prev = await this.prismaService.materialBundle.findMany({
        where: {
          ...getPrevWhereBySort(sortPattern, cursor),
          ...this.buildWhereCondition(keywords),
        },
        orderBy: sortPattern,
        take: pageSize,
      });

      const curr = await this.prismaService.materialBundle.findMany({
        where: {
          ...getCurrWhereBySort(sortPattern, cursor),
          ...this.buildWhereCondition(keywords),
        },
        orderBy: sortPattern,
        take: pageSize + 1,
      });
      const currDtos = await Promise.all(
        curr.map((r) => this.getBundleDetail(r.id, viewerId, ip, userAgent)),
      );
      return PageHelper.PageMiddle(
        prev,
        currDtos,
        pageSize,
        (i) => i.id,
        (i) => i.id,
      );
    }
  }
  private buildWhereCondition(query: string): Prisma.MaterialBundleWhereInput {
    if (!query) {
      return {};
    }

    const conditions: Prisma.MaterialBundleWhereInput[] = [];
    const regex = /(\w+)(:>=|:<=|:>|:<|:)(\w+)/g;
    let match;

    // Parsing special conditions like rating:>=4
    while ((match = regex.exec(query)) !== null) {
      const [, field, operator, value] = match;
      let condition: Prisma.MaterialBundleWhereInput;
      switch (operator) {
        case ':>=':
          condition = { [field]: { gte: parseFloat(value) } };
          break;
        case ':<=':
          condition = { [field]: { lte: parseFloat(value) } };
          break;
        case ':>':
          condition = { [field]: { gt: parseFloat(value) } };
          break;
        case ':<':
          condition = { [field]: { lt: parseFloat(value) } };
          break;
        case ':':
          condition = { [field]: { contains: value, mode: 'insensitive' } };
          break;
        default:
          // This should never happen
          throw new Error(`Invalid operator: ${operator}`);
      }

      conditions.push(condition);
    }
    // If no special conditions were matched, treat the entire query as a keyword search
    if (conditions.length === 0) {
      conditions.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      });
    }
    return conditions.length > 0 ? { AND: conditions } : {};
  }

  async getBundleDetail(
    bundleId: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<materialBundleDto> {
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
      userDto = await this.usersService.getUserDtoById(
        bundle.creatorId,
        viewerId,
        ip,
        userAgent,
      );
    } catch (e) {
      // If user is null, it means that one user created this, but the user
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
      materialIds.map((id) =>
        this.materialsService.getMaterial(id, viewerId, ip, userAgent),
      ),
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
    if (bundle.creatorId !== userId)
      throw new UpdateBundleDeniedError(bundleId);
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
        if (materialIdsToAdd.length > 0) {
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
    if (bundle.creatorId !== userId) throw new DeleteBundleDeniedError(id);
    await this.prismaService.materialBundle.delete({
      where: {
        id,
      },
    });
    return;
  }

  async getMaterialBundleCreatorId(bundleId: number): Promise<number> {
    const bundle = await this.prismaService.materialBundle.findUnique({
      where: {
        id: bundleId,
      },
    });
    if (!bundle) throw new BundleNotFoundError(bundleId);
    return bundle.creatorId;
  }
}

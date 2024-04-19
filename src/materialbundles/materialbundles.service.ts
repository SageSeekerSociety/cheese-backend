import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { materialBundleDto } from './DTO/materialbundle.dto';
import { UserDto } from '../users/DTO/user.dto';
import { UsersService } from '../users/users.service';
import { MaterialsService } from '../materials/materials.service';

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
    const newBundle = await this.prismaService.materialBundle.create({
      data: {
        title,
        content,
        materials: {
          connect: materialIds.map((id) => ({ id })),
        },
        creatorId,
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
      include: {
        materials: true,
      },
    });
    if (!bundle) {
      throw new Error();
    }
    let userDto: UserDto | null = null; // For case that user is deleted.
    try {
      userDto = await this.usersService.getUserDtoById(bundle.creatorId);
    } catch (e) {
      // If user is null, it means that one user created this question, but the user
      // does not exist now. This is NOT a data integrity problem, since user can be
      // deleted. So we just return a null and not throw an error.
    }
    const materialIds = bundle.materials.map((material) => material.id);
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
    });
    if (!bundle) throw new Error();
    if (bundle.creatorId != userId) throw new Error();
    const data: any = {};
    if (title !== undefined) {
      data.title = title;
    }
    if (content !== undefined) {
      data.content = content;
    }
    if (materials !== undefined) {
      data.materials = {
        connect: materials.map((id) => ({ id })),
        disconnect: materials.map((id) => ({ id })),
      };
    }
    await this.prismaService.materialBundle.update({
      where: {
        id: bundleId,
      },
      data: {
        title,
        content,
        materials: {
          connect: materials ? materials.map((id) => ({ id })) : undefined,
          disconnect: materials ? materials.map((id) => ({ id })) : undefined,
        },
      },
    });
  }
}

/*
 *  Description: This file implements the MaterialbundlesController class,
 *               which is responsible for handling the requests to /material-bundles
 *
 *  Author(s):
 *      nameisyui
 *
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  createMaterialBundleRequestDto,
  createMaterialBundleResponseDto,
} from './DTO/create-materialbundle.dto';
//import { getMaterialBundleListDto } from './DTO/get-materialbundle.dto';
import {
  AuthToken,
  CurrentUserOwnResource,
  Guard,
  ResourceId,
  ResourceOwnerIdGetter,
} from '../auth/guard.decorator';
import { UserId } from '../auth/user-id.decorator';
import { BaseResponseDto } from '../common/DTO/base-response.dto';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import {
  getMaterialBundleListDto,
  getMaterialBundlesResponseDto,
} from './DTO/get-materialbundle.dto';
import { BundleResponseDto } from './DTO/materialbundle.dto';
import { updateMaterialBundleDto } from './DTO/update-materialbundle.dto';
import { MaterialbundlesService } from './materialbundles.service';

@Controller('/material-bundles')
export class MaterialbundlesController {
  constructor(
    private readonly materialbundlesService: MaterialbundlesService,
    private readonly authService: AuthService,
  ) {}

  @ResourceOwnerIdGetter('material-bundle')
  async getMaterialBundleOwner(
    materialBundleId: number,
  ): Promise<number | undefined> {
    return this.materialbundlesService.getMaterialBundleCreatorId(
      materialBundleId,
    );
  }

  @Post()
  @Guard('create', 'material-bundle')
  @CurrentUserOwnResource()
  async createMaterialBundle(
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @Body()
    { title, content, materials }: createMaterialBundleRequestDto,
    @UserId(true) userId: number,
  ): Promise<createMaterialBundleResponseDto> {
    const bundleId = await this.materialbundlesService.createBundle(
      title,
      content,
      materials,
      userId,
    );
    return {
      code: 201,
      message: 'MaterialBundle created successfully',
      data: {
        id: bundleId,
      },
    };
  }

  @Get()
  @Guard('enumerate', 'material-bundle')
  async getMaterialBundleList(
    @Query()
    {
      q,
      page_start: pageStart,
      page_size: pageSize,
      sort,
    }: getMaterialBundleListDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
    @UserId() viewerId: number | undefined,
  ): Promise<getMaterialBundlesResponseDto> {
    const [bundles, page] = await this.materialbundlesService.getBundles(
      q,
      pageStart,
      pageSize,
      sort.toString(),
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'get material bundles successfully',
      data: {
        materials: bundles,
        page,
      },
    };
  }
  @Get('/:materialBundleId')
  @Guard('query', 'material-bundle')
  async getMaterialBundleDetail(
    @Param('materialBundleId', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
    @UserId() viewerId: number | undefined,
  ): Promise<BundleResponseDto> {
    const materialBundle = await this.materialbundlesService.getBundleDetail(
      id,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'get material bundle detail successfully',
      data: {
        materialBundle,
      },
    };
  }
  @Patch('/:materialBundleId')
  @Guard('modify', 'material-bundle')
  async updateMaterialBundle(
    @Param('materialBundleId', ParseIntPipe) @ResourceId() id: number,
    @Body() { title, content, materials }: updateMaterialBundleDto,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ): Promise<BaseResponseDto> {
    await this.materialbundlesService.updateMaterialBundle(
      id,
      userId,
      title,
      content,
      materials,
    );
    return {
      code: 200,
      message: 'Materialbundle updated successfully',
    };
  }
  @Delete('/:materialBundleId')
  @Guard('delete', 'material-bundle')
  async deleteMaterialBundle(
    @Param('materialBundleId', ParseIntPipe) @ResourceId() id: number,
    @Headers('Authorization') @AuthToken() auth: string | undefined,
    @UserId(true) userId: number,
  ) {
    await this.materialbundlesService.deleteMaterialBundle(id, userId);
  }
}

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
import { AuthorizedAction } from '../auth/definitions';
import {
  createMaterialBundleRequestDto,
  createMaterialBundleResponseDto,
} from './DTO/create-materialbundle.dto';
//import { getMaterialBundleListDto } from './DTO/get-materialbundle.dto';
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
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class MaterialbundlesController {
  constructor(
    private readonly materialbundlesService: MaterialbundlesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createMaterialBundle(
    @Headers('Authorization') auth: string | undefined,
    @Body()
    { title, content, materials }: createMaterialBundleRequestDto,
  ): Promise<createMaterialBundleResponseDto> {
    const creatorId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      creatorId,
      'materialbundle',
      undefined,
    );
    const bundleId = await this.materialbundlesService.createBundle(
      title,
      content,
      materials,
      creatorId,
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
  async getMaterialBundleList(
    @Query()
    {
      q,
      page_start: pageStart,
      page_size: pageSize,
      sort,
    }: getMaterialBundleListDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<getMaterialBundlesResponseDto> {
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
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
  async getMaterialBundleDetail(
    @Param('materialBundleId', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,
  ): Promise<BundleResponseDto> {
    let viewerId: number | undefined;
    try {
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
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
  async updateMaterialBundle(
    @Param('materialBundleId', ParseIntPipe) id: number,
    @Body() { title, content, materials }: updateMaterialBundleDto,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<BaseResponseDto> {
    //console.log(title, content, materials);
    const userId = this.authService.verify(auth).userId;
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
  async deleteMaterialBundle(
    @Param('materialBundleId', ParseIntPipe) id: number,
    @Headers('Authorization') auth: string | undefined,
  ) {
    const userId = this.authService.verify(auth).userId;
    await this.materialbundlesService.deleteMaterialBundle(id, userId);
  }
}

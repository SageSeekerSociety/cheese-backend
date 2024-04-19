import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthorizedAction, AuthService } from '../auth/auth.service';
import {
  createMaterialBundleRequestDto,
  createMaterialBundleResponseDto,
} from './DTO/create-materialbundle.dto';
//import { getMaterialBundleListDto } from './DTO/get-materialbundle.dto';
import { BundleResponseDto } from './DTO/materialbundle.dto';
import { MaterialbundlesService } from './materialbundles.service';
import { updateMaterialBundleDto } from './DTO/update-materialbundle.dto';

@Controller('/material-bundles')
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
  /*@Get()
  async getMaterialBundleList(
  @Query()
  { q, page_start: pageStart, page_size: pageSize ,sort}: getMaterialBundleListDto,
    @Headers('Authorization') auth: string | undefined,
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string,) {
    let viewerId: number | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      viewerId = this.authService.verify(auth).userId;
    } catch {
      // The user is not logged in.
    }
      const [bundles, page] = await this.materialbundlesService.getBundles(
        q,
        pageStart,
        pageSize,
        sort,
        viewerId,
        ip,
        userAgent,
      );
      return {

      }
  } */
  @Get('/:materialBundleId')
  async getMaterialBundleDetail(
    @Param('materialBundleId', ParseIntPipe) id: number,
  ): Promise<BundleResponseDto> {
    const materialBundle =
      await this.materialbundlesService.getBundleDetail(id);
    return {
      code: 200,
      message: ' get material bundle detail successfully',
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
  ) {
    console.log(title, content, materials);
    const userId = this.authService.verify(auth).userId;
    await this.materialbundlesService.updateMaterialBundle(
      id,
      userId,
      title,
      content,
      materials,
    );
  }
}

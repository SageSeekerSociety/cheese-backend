import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthorizedAction, AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { GetMaterialResponseDto } from './DTO/get-material.dto';
import { MaterialTypeDto } from './DTO/material.dto';
import { UploadMaterialResponseDto } from './DTO/upload-material.dto';
import { MaterialsService } from './materials.service';

@Controller('/materials')
@UsePipes(new ValidationPipe())
@UseFilters(new BaseErrorExceptionFilter())
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(
    @Body() { type: materialType }: MaterialTypeDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UploadMaterialResponseDto> {
    const uploaderId = this.authService.verify(auth).userId;
    this.authService.audit(
      auth,
      AuthorizedAction.create,
      uploaderId,
      'material',
      undefined,
    );
    const materialId = await this.materialsService.uploadMaterial(
      materialType,
      file,
      uploaderId,
    );
    return {
      code: 200,
      message: 'Material upload successfully',
      data: {
        id: materialId,
      },
    };
  }

  @Get('/:materialId')
  async getMaterialDetail(
    @Param('materialId', ParseIntPipe) id: number,
  ): Promise<GetMaterialResponseDto> {
    const material = await this.materialsService.getMaterial(id);
    return {
      code: 200,
      message: 'Get Material successfully',
      data: {
        material,
      },
    };
  }
  @Delete('/:materialId') // to do
  async deleteMaterial() //@Param('materialId') id: number,
  //@Headers('Authorization') auth: string | undefined,
  : Promise<void> {
    /* istanbul ignore next */
    throw new Error('deleteMaterial method is not implemented yet.');
  }
}

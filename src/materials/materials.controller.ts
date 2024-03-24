import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { GetMaterialRespondDto } from './DTO/get-material.dto';
import { UploadMaterialRespondDto } from './DTO/upload-material.dto';
import { MaterialsService } from './materials.service';
import { MaterialTypeDto } from './DTO/material.dto';

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
  ): Promise<UploadMaterialRespondDto> {
    this.authService.verify(auth);
    const materialId = await this.materialsService.uploadMaterial(
      materialType,
      file,
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
    @Query('fields') fields: string = 'url,meta',
  ): Promise<GetMaterialRespondDto> {
    const fieldList = fields.split(',');
    const material = await this.materialsService.getMaterial(id, fieldList);
    return {
      code: 200,
      message: 'Get Material successfully',
      data: {
        material,
      },
    };
  }
  @Delete(':/materialId') // to do
  async deleteMaterial() {
    //@Param('materialId') id: number,
    return 204;
  }
}

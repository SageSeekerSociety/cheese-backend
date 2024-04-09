import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseArrayPipe,
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
    @Query('fields', new ParseArrayPipe({ separator: ',', optional: true }))
    fields: string[] = ['meta', 'url'],
  ): Promise<GetMaterialResponseDto> {
    const material = await this.materialsService.getMaterial(id, fields);
    return {
      code: 200,
      message: 'Get Material successfully',
      data: {
        material,
      },
    };
  }
  @Delete('/:materialId') // to do
  async deleteMaterial(): Promise<void> {
    //@Param('materialId') id: number,
    /* istanbul ignore next */
    throw new Error('deleteMaterial method is not implemented yet.');
  }
}

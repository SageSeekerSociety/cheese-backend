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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import { BaseErrorExceptionFilter } from '../common/error/error-filter';
import { GetMaterialRespondDto } from './DTO/get-material.dto';
import {
  UploadMaterialRequestDto,
  UploadMaterialRespondDto,
} from './DTO/upload-material.dto';
import { MaterialsService } from './materials.service';

@Controller('/materials')
@UseFilters(new BaseErrorExceptionFilter())
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(
    @Body() req: UploadMaterialRequestDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('Authorization') auth: string | undefined,
  ): Promise<UploadMaterialRespondDto> {
    console.log(req);
    this.authService.verify(auth);
    const materialId = await this.materialsService.uploadMaterial(
      req.type,
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
    @Query('fields') fields: string,
  ): Promise<GetMaterialRespondDto> {
    fields; // ?
    const material = await this.materialsService.getMaterial(id);
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

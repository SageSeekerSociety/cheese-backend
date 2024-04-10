import { Material } from '@prisma/client';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface GetMaterialResponseDto extends BaseResponseDto {
  data: {
    material: Material;
  };
}

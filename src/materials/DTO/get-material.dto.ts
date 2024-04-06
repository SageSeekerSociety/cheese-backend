import { Material } from '@prisma/client';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class GetMaterialResponseDto extends BaseResponseDto {
  data: {
    material: Material;
  };
}

import { Material } from '@prisma/client';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class GetMaterialRespondDto extends BaseRespondDto {
  data: {
    material: Material;
  };
}

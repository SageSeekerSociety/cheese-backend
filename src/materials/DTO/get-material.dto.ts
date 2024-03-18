import { material } from '@prisma/client';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class GetMaterialRespondDto extends BaseRespondDto {
  data: {
    material: material;
  };
}

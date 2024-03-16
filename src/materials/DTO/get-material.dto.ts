import { FileMeta, ImageMeta, VideoMeta } from '@prisma/client';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class GetMaterialRespondDto extends BaseRespondDto {
  data: {
    material: {
      id: number;
      type: string;
      url: string;
      meta: ImageMeta | VideoMeta | FileMeta;
    };
  };
}

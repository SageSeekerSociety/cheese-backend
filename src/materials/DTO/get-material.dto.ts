import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { materialDto } from './material.dto';

export class GetMaterialResponseDto extends BaseResponseDto {
  data: {
    material: materialDto;
  };
}

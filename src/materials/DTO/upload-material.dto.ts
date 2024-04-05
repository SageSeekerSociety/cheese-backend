import { IsIn, IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UploadMaterialRequestDto {
  @IsString()
  @IsIn(['file', 'image', 'video', 'audio'])
  type: string;
}

export class UploadMaterialRespondDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

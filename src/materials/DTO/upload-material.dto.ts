import { IsIn, IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class UploadMaterialRequestDto {
  @IsString()
  @IsIn(['file', 'image', 'video', 'audio'])
  type: string;
}

export class UploadMaterialResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

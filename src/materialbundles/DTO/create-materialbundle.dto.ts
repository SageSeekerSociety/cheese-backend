import { IsArray, IsInt, IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class createMaterialBundleRequestDto {
  @IsString()
  title: string;
  @IsString()
  content: string;
  @IsArray()
  @IsInt({ each: true })
  materials: number[];
}
export class createMaterialBundleResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

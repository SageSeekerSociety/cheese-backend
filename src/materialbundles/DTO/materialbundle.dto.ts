import { float } from '@elastic/elasticsearch/lib/api/types';
import { UserDto } from '../../users/DTO/user.dto';
import { materialDto } from '../../materials/DTO/material.dto';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class materialBundleDto {
  id: number;
  title: string;
  content: string;
  creator: UserDto | null;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  rating: float;
  rating_count: number;
  my_rating: number | undefined;
  comments_count: number;
  materials: materialDto[];
}

export class BundleResponseDto extends BaseResponseDto {
  data: {
    materialBundle: materialBundleDto;
  };
}

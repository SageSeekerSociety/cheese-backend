import { IsEnum, IsOptional } from 'class-validator';
import { PageWithKeywordDto } from '../../common/DTO/page.dto';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { materialBundleDto } from './materialbundle.dto';
import { PageDto } from '../../common/DTO/page-response.dto';

enum sortRule {
  Rating = 'rating',
  Download = 'download',
  Newest = 'newest',
  Empty = '',
}
export class getMaterialBundleListDto extends PageWithKeywordDto {
  @IsOptional()
  @IsEnum(sortRule)
  sort: sortRule;
}

export class getMaterialBundlesResponseDto extends BaseResponseDto {
  data: {
    materials: materialBundleDto[];
    page: PageDto;
  };
}

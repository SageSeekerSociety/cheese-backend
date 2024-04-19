import { IsEnum, IsOptional } from 'class-validator';
import { PageWithKeywordDto } from '../../common/DTO/page.dto';

enum sortRule {
  rating,
  download,
  newest,
}
export class getMaterialBundleListDto extends PageWithKeywordDto {
  @IsOptional()
  @IsEnum(sortRule)
  sort: string;
}

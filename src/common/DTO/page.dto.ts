import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { GroupQueryType } from '../../groups/groups.service';

export class PageDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page_start?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page_size: number = 20;
}

export class PageWithKeywordDto extends PageDto {
  q: string;
}

export class GroupPageDto extends PageWithKeywordDto {
  @IsEnum(GroupQueryType)
  type: GroupQueryType = GroupQueryType.Recommend;
}

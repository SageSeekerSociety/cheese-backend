import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { GroupDto } from './group.dto';

export class GetGroupsResponseDto extends BaseResponseDto {
  data: {
    groups: GroupDto[];
    page: PageDto;
  };
}

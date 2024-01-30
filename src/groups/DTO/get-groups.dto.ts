import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { GroupDto } from './group.dto';

export class GetGroupsRespondDto extends BaseRespondDto {
  data: {
    groups: GroupDto[];
    page: PageRespondDto;
  };
}

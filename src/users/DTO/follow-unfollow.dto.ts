import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class FollowRespondDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

export class UnfollowRespondDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

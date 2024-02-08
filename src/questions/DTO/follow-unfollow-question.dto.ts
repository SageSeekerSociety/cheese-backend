import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class FollowQuestionResponseDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

export class UnfollowQuestionResponseDto extends BaseRespondDto {
  data: {
    follow_count: number;
  };
}

import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class FollowQuestionResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

export class UnfollowQuestionResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

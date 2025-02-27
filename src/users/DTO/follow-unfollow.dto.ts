import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class FollowResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

export class UnfollowResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

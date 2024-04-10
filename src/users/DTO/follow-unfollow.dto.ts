import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface FollowResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

export interface UnfollowResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

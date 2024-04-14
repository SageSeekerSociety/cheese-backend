import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export interface FollowQuestionResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

export interface UnfollowQuestionResponseDto extends BaseResponseDto {
  data: {
    follow_count: number;
  };
}

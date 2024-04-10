import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export interface GetQuestionRecommendationsResponseDto extends BaseResponseDto {
  data: {
    users: UserDto[];
  };
}

import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetQuestionRecommendationsResponseDto extends BaseResponseDto {
  data: {
    users: UserDto[];
  };
}

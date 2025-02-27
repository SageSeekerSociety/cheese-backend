import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetQuestionFollowerResponseDto extends BaseResponseDto {
  data: {
    users: UserDto[];
    page: PageDto;
  };
}

import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { PageRespondDto } from '../../common/DTO/page-respond.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GetQuestionFollowerResponseDto extends BaseRespondDto {
  data: {
    users: UserDto[];
    page: PageRespondDto;
  };
}

import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class CreateCommentResponseDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class uploadAttachmentDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

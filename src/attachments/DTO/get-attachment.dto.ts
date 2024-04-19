import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { attachmentDto } from './attachments.dto';

export class getAttachmentResponseDto extends BaseResponseDto {
  data: {
    attachment: attachmentDto;
  };
}

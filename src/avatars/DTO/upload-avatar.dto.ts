import { BaseResponseDto } from '../../common/DTO/base-response.dto';
export class UploadAvatarResponseDto extends BaseResponseDto {
  data: {
    avatarId: number;
  };
}

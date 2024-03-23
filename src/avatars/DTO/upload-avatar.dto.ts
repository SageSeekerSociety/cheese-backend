import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
export class UploadAvatarRespondDto extends BaseRespondDto {
  data: {
    avatarId: number;
  };
}

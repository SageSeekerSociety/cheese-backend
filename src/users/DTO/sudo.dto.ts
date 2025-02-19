import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class VerifySudoResponseDto extends BaseResponseDto {
  data: {
    accessToken: string;
  };
}

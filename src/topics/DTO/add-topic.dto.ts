import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class AddTopicRequestDto {
  @IsString()
  name: string;
}

export class AddTopicResponseDto extends BaseResponseDto {
  data: {
    id: number;
  };
}

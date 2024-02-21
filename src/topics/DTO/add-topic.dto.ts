import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class AddTopicRequestDto {
  @IsString()
  name: string;
}

export class AddTopicResponseDto extends BaseRespondDto {
  data: {
    id: number;
  };
}

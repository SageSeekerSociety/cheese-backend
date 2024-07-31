import { IsNotEmpty, IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class GetGroupNameAvailabilityRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class GetGroupNameAvailabilityResponseDto extends BaseResponseDto {
  data: {
    available: boolean;
    recommend_names: string[] | undefined;
  };
}

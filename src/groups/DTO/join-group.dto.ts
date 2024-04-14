import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class JoinGroupDto {
  @IsString()
  readonly intro: string;
}

export class JoinGroupResultDto {
  member_count: number;
  is_member: boolean;
  is_waiting: boolean;
}

export interface JoinGroupResponseDto extends BaseResponseDto {
  data: JoinGroupResultDto;
}

import { IsString } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class SendEmailVerifyCodeRequestDto {
  @IsString()
  email: string;
}

export class SendEmailVerifyCodeResponseDto extends BaseResponseDto {}

import { IsString } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class SendEmailVerifyCodeRequestDto {
  @IsString()
  email: string;
}

export class SendEmailVerifyCodeResponseDto extends BaseRespondDto {}

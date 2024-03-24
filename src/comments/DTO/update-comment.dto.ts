import { IsNotEmpty } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UpdateCommentDto {
  @IsNotEmpty()
  content: string;
}

export class UpdateCommentResponseDto extends BaseRespondDto {}

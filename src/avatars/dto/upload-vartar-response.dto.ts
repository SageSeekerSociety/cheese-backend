import { IsInt } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class UploadVartarRespondDto extends BaseRespondDto {
  @IsInt()
  avatarid: number;
}

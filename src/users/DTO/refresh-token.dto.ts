import { BaseRespondDto } from '../../common/DTO/base-respond.dto';

export class RefreshTokenRespondDto extends BaseRespondDto {
  data: {
    accessToken: string;
  };
}

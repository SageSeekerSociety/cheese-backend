/*
 *  Description: This file defines the DTOs for SRP authentication.
 */

import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class SrpInitRequestDto {
  username: string;
  clientPublicEphemeral: string;
}

export class SrpInitResponseDto extends BaseResponseDto {
  data: {
    salt: string;
    serverPublicEphemeral: string;
  };
}

export class SrpVerifyRequestDto {
  username: string;
  clientProof: string;
}

export class SrpVerifyResponseDto extends BaseResponseDto {
  data: {
    serverProof: string;
    accessToken: string;
    requires2FA: boolean;
    tempToken?: string;
    user?: UserDto;
  };
}

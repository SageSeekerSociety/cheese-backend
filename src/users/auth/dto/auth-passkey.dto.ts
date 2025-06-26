// src/users/auth/dto/auth-passkey.dto.ts
import {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { BaseResponseDto } from '../../../common/DTO/base-response.dto';
// TODO: UserDto path will change to ../../account/dto/user.dto
import { UserDto } from '../../DTO/user.dto';

// Authentication DTOs
export class PasskeyAuthenticationOptionsRequestDto {
  userId?: number; // For username-less discovery
}

export class PasskeyAuthenticationOptionsResponseDto extends BaseResponseDto {
  data: {
    options: PublicKeyCredentialRequestOptionsJSON;
  };
}

export class PasskeyAuthenticationVerifyRequestDto {
  response: AuthenticationResponseJSON;
}

export class PasskeyAuthenticationVerifyResponseDto extends BaseResponseDto {
  data: {
    user: UserDto; // This UserDto will eventually come from AccountService/DTO
    accessToken: string;
  };
}

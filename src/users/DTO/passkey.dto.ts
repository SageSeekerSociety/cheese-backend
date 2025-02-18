import {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from './user.dto';

// Registration DTOs
export class PasskeyRegistrationOptionsResponseDto extends BaseResponseDto {
  data: {
    options: PublicKeyCredentialCreationOptionsJSON;
  };
}

export class PasskeyRegistrationVerifyRequestDto {
  response: RegistrationResponseJSON;
}

export class PasskeyRegistrationVerifyResponseDto extends BaseResponseDto {}

// Authentication DTOs
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
    user: UserDto;
    accessToken: string;
  };
}

// Passkey Management DTOs
export interface PasskeyInfo {
  id: string;
  createdAt: Date;
  deviceType: string;
  backedUp: boolean;
}

export class GetPasskeysResponseDto extends BaseResponseDto {
  data: {
    passkeys: PasskeyInfo[];
  };
}

export class DeletePasskeyResponseDto extends BaseResponseDto {}

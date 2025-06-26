// src/users/security/dto/manage-passkey.dto.ts
import {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { BaseResponseDto } from '../../../common/DTO/base-response.dto';

// Registration DTOs (used when a logged-in user adds a new passkey)
export class PasskeyRegistrationOptionsResponseDto extends BaseResponseDto {
  data: {
    options: PublicKeyCredentialCreationOptionsJSON;
  };
}

export class PasskeyRegistrationVerifyRequestDto {
  response: RegistrationResponseJSON;
}

export class PasskeyRegistrationVerifyResponseDto extends BaseResponseDto {}

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

import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class Enable2FARequestDto {
  code?: string;
  secret?: string;
}

export class Disable2FARequestDto {
  code: string;
}

export class Verify2FARequestDto {
  temp_token: string;
  code: string;
}

export class GenerateBackupCodesRequestDto {
  code: string;
}

export class TOTPSetupResponseDto extends BaseResponseDto {
  data: {
    secret?: string;
    otpauth_url?: string;
    backup_codes?: string[];
  };
}

export class BackupCodesResponseDto extends BaseResponseDto {
  data: {
    backup_codes: string[];
  };
}

export class Enable2FAResponseDto extends BaseResponseDto {
  data: {
    secret: string;
    otpauth_url: string;
    qrcode: string;
    backup_codes: string[];
  };
}

export class Disable2FAResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
  };
}

export class GenerateBackupCodesResponseDto extends BaseResponseDto {
  data: {
    backup_codes: string[];
  };
}

export class Get2FAStatusResponseDto extends BaseResponseDto {
  data: {
    enabled: boolean;
    has_passkey: boolean;
    always_required: boolean;
  };
}

export class Update2FASettingsRequestDto {
  always_required: boolean;
}

export class Update2FASettingsResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
    always_required: boolean;
  };
}

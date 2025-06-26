// src/users/security/dto/manage-totp.dto.ts
import { BaseResponseDto } from '../../../common/DTO/base-response.dto';

export class Enable2FARequestDto {
  code?: string; // For verification step
  secret?: string; // For verification step, sent back by client
}

export class Disable2FARequestDto {
  // May require current TOTP code or password for sudo, handled by Guard/Service
  // For now, let's assume if it's just this, it implies sudo access is already granted.
  // If a code is needed for disabling, it should be part of this DTO.
  // The original controller has `dto: Disable2FARequestDto` which is empty in current DTO.
  // Let's assume it can be empty if sudo is confirmed, or it might need a password/totp field
  // depending on the actual `Guard('modify-2fa', 'user', true)` implementation.
  // For now, keeping it potentially empty or adding a field if service logic dictates.
  // Let's assume the guard handles sudo, so this DTO might not need a code.
  // The original DTO had `code: string` for Disable2FARequestDto, let's re-evaluate.
  // The controller for disable2FA doesn't use the 'code' from Disable2FARequestDto.
  // It seems the DTO was defined but not used for 'code'.
  // Let's make it an empty object for now, or one that could take a sudo-proof if needed.
  // For simplicity, if the guard ensures sudo, this DTO might not need fields.
  // The original UsersController for disable2FA has `@Body() dto: Disable2FARequestDto`,
  // and the DTO is defined as `code: string;`. But the controller doesn't use `dto.code`.
  // It's safer to include it if the intention was there, or remove it if truly unused.
  // Let's assume it was intended for future use or an oversight and keep it minimal.
  // Given the `Guard('modify-2fa', 'user', true)` (sudo), this DTO might not need any fields.
  // Let's keep it empty for now.
}

export class GenerateBackupCodesRequestDto {
  // Similar to disable, sudo is likely required.
  // The original UsersController for generateBackupCodes has `@Body() dto: GenerateBackupCodesRequestDto`
  // and the DTO is defined as `code: string;` but not used.
  // Let's keep it empty.
}

// This DTO seems like a generic response for the initial setup phase of enabling 2FA,
// where secret, otpauth_url are provided, and potentially initial backup codes.
// Let's use Enable2FAResponseDto for the final confirmation response.
// The initial step of enable2FA in controller returns secret, otpauth_url, qrcode.
// The confirmation step returns the same + backup_codes.
// So Enable2FAResponseDto covers the confirmation.
// What about the initial step? The controller returns an object shape like Enable2FAResponseDto but without backup_codes.
// Let's refine Enable2FAResponseDto to have optional backup_codes or create a specific one for init.
// For now, Enable2FAResponseDto will be used for the final step.

export class Enable2FAResponseDto extends BaseResponseDto {
  data: {
    secret: string;
    otpauth_url: string;
    qrcode: string;
    backup_codes: string[]; // These are generated upon successful enabling
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
    has_passkey: boolean; // Good to know if other strong factors exist
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

// TOTPSetupResponseDto was present but Enable2FAResponseDto seems to cover the final state.
// If there's a distinct "setup initiation" response that differs significantly, it could be added.
// The controller's `enable2FA` initial step (when no code is provided) returns:
// { secret, otpauth_url, qrcode, backup_codes: [] }
// The confirmation step returns the same structure but with actual backup_codes.
// So `Enable2FAResponseDto` can serve both if `backup_codes` is always expected (even if empty).
// Or, we can make `backup_codes` optional in `Enable2FAResponseDto` if that's cleaner for the initial step.
// Let's make backup_codes non-optional for the final response, meaning the initial step might use a slightly different DTO or partial.
// For now, `Enable2FAResponseDto` is for the state *after* successful verification and enabling.
// The controller can dynamically construct the response for the initial step.
// `BackupCodesResponseDto` is identical to `GenerateBackupCodesResponseDto`, remove one.
// Let's keep GenerateBackupCodesResponseDto.
// `TOTPSetupResponseDto` seems redundant if `Enable2FAResponseDto` is used for the final setup step.
// The initial step's response can be directly constructed by the controller to match the fields of Enable2FAResponseDto,
// with an empty backup_codes array.
// So, `TOTPSetupResponseDto` and `BackupCodesResponseDto` can be removed.
// Let's keep the DTOs that map directly to controller request/response signatures.
// The original `Enable2FAResponseDto` already has `qrcode` and `backup_codes`.
// The original `TOTPSetupResponseDto` had optional secret, otpauth_url, backup_codes.
// The actual controller `enable2FA` (initial step) returns `secret, otpauth_url, qrcode, backup_codes: []`.
// The actual controller `enable2FA` (final step) returns `secret, otpauth_url, qrcode, backup_codes: actual_codes`.
// So `Enable2FAResponseDto` is fine as is.
// `Disable2FARequestDto` was `code: string` - but controller doesn't use it. Sudo is main gate.
// `GenerateBackupCodesRequestDto` was `code: string` - controller doesn't use it. Sudo is main gate.
// For `Disable2FARequestDto` and `GenerateBackupCodesRequestDto`, if they are truly empty due to Sudo,
// then an empty class is fine. Or NestJS allows omitting `@Body()` if not needed.
// Let's keep them as empty classes for now if the controller signature expects a body.
// Re-checking controller: `disable2FA` takes `dto: Disable2FARequestDto`. `generateBackupCodes` takes `dto: GenerateBackupCodesRequestDto`.
// So they expect a body, even if empty.
// The original DTOs had `code: string;`. This might be a leftover or intended for a non-sudo path.
// Since the guard enforces sudo, the code is likely not needed from the DTO.
// For safety and to match original structure slightly, let's make `code` optional in these request DTOs,
// acknowledging it's not used by current controller logic if sudo is active.

export class CleanedDisable2FARequestDto {
  // Sudo is primary means of auth for this action.
  // code?: string; // Optional: if a TOTP code was also required for some reason (currently not used by controller)
}

export class CleanedGenerateBackupCodesRequestDto {
  // Sudo is primary means of auth.
  // code?: string; // Optional: if a TOTP code was also required (currently not used by controller)
}

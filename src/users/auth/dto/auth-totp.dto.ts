// src/users/auth/dto/auth-totp.dto.ts

// Used during login flow to verify a TOTP code after primary authentication
export class Verify2FARequestDto {
  temp_token: string; // Temporary token received after primary auth indicated 2FA is required
  code: string;       // The TOTP code from the authenticator app
}

// LoginResponseDto (already in ./login.dto.ts) handles the output of a successful 2FA verification
// by setting requires2FA to false and including the access token.
// So, no specific response DTO is needed here for successful 2FA verification leading to login.
// Error DTOs like TOTPInvalidError, TOTPTempTokenInvalidError are in auth/errors/auth.error.ts

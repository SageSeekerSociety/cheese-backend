// src/users/auth/dto/auth-oauth.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { BaseResponseDto } from '../../../common/DTO/base-response.dto';
// TODO: Adjust path when UserDto is moved to account module: import { UserDto } from '../../account/dto/user.dto';
import { UserDto } from '../../DTO/user.dto'; // Temporary path

export class GetOAuthProvidersResponseDto extends BaseResponseDto {
  data: {
    providers: Array<{
      id: string;
      name: string;
      scope: string[]; // OAuth scopes
    }>;
  };
}

export class OAuthCallbackQueryDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}

// User DTO specific to OAuth context, might include email if available from provider
export class OAuthUserDto extends UserDto { // UserDto will be from account/dto
  email?: string | null;
}

// This DTO was originally in oauth.dto.ts but seems more like a response for the main auth flow.
// It represents the various states an OAuth login attempt can result in before session establishment.
export class OAuthLoginFlowResponseDto extends BaseResponseDto {
  data: {
    // For successful immediate login (existing linked OAuth account)
    user?: OAuthUserDto; // Full user DTO if login is direct
    accessToken?: string; // Access token if login is direct

    // For flows requiring further user action
    requiresVerification?: boolean; // True if email exists, needs verification (password/SRP)
    verificationType?: 'password' | 'srp';
    email?: string; // Email of the account to verify against
    salt?: string; // For SRP verification
    serverPublicEphemeral?: string; // For SRP verification
    sessionId?: string; // Session ID for the verification flow (password or SRP)

    requiresDecision?: boolean; // True if user needs to choose: create new or link to existing
    stateToken?: string; // Token containing OAuth info for client to make decision
  };
}

// Request DTO for verifying an existing local account during an OAuth flow
// (e.g., when OAuth email matches an existing user's email)
export class OAuthVerifyRequestDto {
  @IsString()
  sessionId: string; // Identifier for the ongoing OAuth verification session

  // For password-based verification
  @IsOptional()
  @IsString()
  password?: string;

  // For SRP-based verification
  @IsOptional()
  @IsString()
  clientPublicEphemeral?: string;

  @IsOptional()
  @IsString()
  clientProof?: string;
}

// DTO for client to send when creating a new user based on OAuth info + user decision
export class CreateUserFromOAuthRequestDto {
  @IsString()
  stateToken: string; // Token received from initial OAuth flow that required decision

  @IsString()
  username: string;

  @IsString()
  nickname: string;
}

// DTO for client to send when binding OAuth to an existing local account after user decision + local login
export class BindOAuthToExistingUserRequestDto {
  @IsString()
  stateToken: string; // Token received from initial OAuth flow that required decision

  @IsString()
  username: string; // Username of the local account to bind to

  // Credentials for the local account
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  clientPublicEphemeral?: string;

  @IsOptional()
  @IsString()
  clientProof?: string;
}

// Note: OAuthLoginResponseDto from original oauth.dto.ts has been refined into OAuthLoginFlowResponseDto
// to better represent the multi-stage nature of the OAuth login/linking process before a final session is established.
// The final successful login (after any verification or decision) will typically result in a standard LoginResponseDto
// or similar, handled by the AuthController's main login/session establishment logic.
// For OAuth, the handleSuccessfulOAuthRedirect in AuthController directly issues cookies and redirects,
// so a specific DTO for the *final* OAuth success might not be explicitly returned as JSON from those endpoints.
// The `PasskeyAuthenticationVerifyResponseDto` (in `auth-passkey.dto.ts`) is a good example of a final auth success DTO.
// A similar one could be `OAuthAuthenticationSuccessResponseDto` if needed.
// For now, `OAuthLoginFlowResponseDto` covers intermediate states, and successful OAuth completion
// is handled by redirect with tokens.
// The `OAuthUserDto` is important for carrying user info during these flows.
// The `OAuthVerifyRequestDto` is for the step where user proves ownership of an existing account.
// `CreateUserFromOAuthRequestDto` and `BindOAuthToExistingUserRequestDto` are for the decision-making step.
// These cover the DTOs needed by AuthController for the OAuth endpoints.
// `OAuthBindRequestDto` (for user-initiated binding from settings) is now in `manage-oauth.dto.ts`.
// `GetUserOAuthConnectionsResponseDto` and `UnbindOAuthResponseDto` are also in `manage-oauth.dto.ts`.
// `GetOAuthProvidersResponseDto` is correctly here in `auth-oauth.dto.ts`.
// `OAuthCallbackQueryDto` is correctly here.
// `OAuthUserDto` is correctly here.
// `OAuthLoginResponseDto` from original file is effectively replaced by `OAuthLoginFlowResponseDto` and the redirect mechanism.
// `OAuthVerifyRequestDto` is correctly here.
// The other DTOs like `OAuthBindRequestDto` etc. are now in `manage-oauth.dto.ts`.
// This split seems correct based on usage (auth flow vs. security settings management).
// The inline DTOs from controller for create/bind post-decision are now formalized here.

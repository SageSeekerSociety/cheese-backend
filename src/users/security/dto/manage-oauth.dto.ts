// src/users/security/dto/manage-oauth.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { BaseResponseDto } from '../../../common/DTO/base-response.dto';

// Request DTO for a logged-in user to initiate binding a new OAuth provider
export class OAuthBindRequestDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  accessType?: string; // e.g., 'offline' for Google refresh token
}

// Response DTO for initiating OAuth binding
export class OAuthBindResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
    provider: string;
    bindUrl?: string; // The URL the user should be redirected to
  };
}

// Response DTO for listing a user's current OAuth connections
export class GetUserOAuthConnectionsResponseDto extends BaseResponseDto {
  data: {
    connections: Array<{
      id: number;
      providerId: string;
      providerName: string; // e.g., "Google", "GitHub"
      providerUserId: string; // User's ID on the provider's system
      connectedAt: string; // ISO date string
    }>;
  };
}

// Response DTO for unbinding an OAuth connection
export class UnbindOAuthResponseDto extends BaseResponseDto {
  data: {
    success: boolean;
    unboundConnectionId: number;
  };
}

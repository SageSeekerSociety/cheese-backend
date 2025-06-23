/*
 * Description: OAuth related DTOs
 *
 * Author(s):
 *     Claude Assistant
 */

import { IsString, IsOptional, IsArray } from 'class-validator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class GetOAuthProvidersResponseDto extends BaseResponseDto {
  data: {
    providers: Array<{
      id: string;
      name: string;
      scope: string[];
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

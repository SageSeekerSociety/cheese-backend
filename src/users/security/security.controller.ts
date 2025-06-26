/*
 *  Description: This file implements the Security controller for user security settings.
 *               It handles Passkey registration, 2FA management, and OAuth connection management.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseFilters,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Might be needed for frontend URLs if any redirect constructed here
import qrcode from 'qrcode'; // For 2FA QR code generation

import { AuthToken, Guard, ResourceId } from '../../auth/guard.decorator';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { BaseErrorExceptionFilter } from '../../common/error/error-filter';
import { PrismaService } from '../../common/prisma/prisma.service'; // For direct DB access if needed, though prefer service layer
import { TOTPService } from '../totp.service'; // Injected directly if SecurityService doesn't abstract all of it
import { UsersService } from '../users.service'; // Original UsersService for findUserRecordOrThrow, will become AccountService

// DTOs for this module
import {
  PasskeyRegistrationOptionsResponseDto,
  PasskeyRegistrationVerifyRequestDto,
  PasskeyRegistrationVerifyResponseDto,
  GetPasskeysResponseDto,
  DeletePasskeyResponseDto,
} from './dto/manage-passkey.dto';
import {
  Enable2FARequestDto,
  Enable2FAResponseDto,
  Disable2FARequestDto, // Assuming this is now an empty DTO or defined in manage-totp.dto.ts
  Disable2FAResponseDto,
  GenerateBackupCodesRequestDto, // Assuming this is now an empty DTO or defined in manage-totp.dto.ts
  GenerateBackupCodesResponseDto,
  Get2FAStatusResponseDto,
  Update2FASettingsRequestDto,
  Update2FASettingsResponseDto,
} from './dto/manage-totp.dto';
import {
  OAuthBindRequestDto,
  OAuthBindResponseDto,
  GetUserOAuthConnectionsResponseDto,
  UnbindOAuthResponseDto,
} from './dto/manage-oauth.dto';

// Service
import { SecurityService } from './security.service';
import { UserIdNotFoundError } from '../account/errors/account.error'; // From account errors
import { ResourceOwnerIdGetter } from '../../auth/guard.decorator'; // Import for Guard

// Define :userId parameter for all routes in this controller
@Controller('/users/:userId/security')
@UseFilters(BaseErrorExceptionFilter)
export class SecurityController {
  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    return userId;
  }
  private readonly logger = new Logger(SecurityController.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly configService: ConfigService, // For URLs, etc.
    // Temporary dependencies, to be refactored when AccountService is fully established
    @Inject(forwardRef(() => UsersService))
    private readonly usersServiceOriginal: UsersService,
    private readonly totpService: TOTPService, // Keep if some direct TOTP utility calls are made
    private readonly prismaService: PrismaService, // For Get2FAStatus direct user fields access
  ) {}

  // --- Passkey Management ---
  @Post('passkeys/options') // Path relative to /users/:userId/security
  @Guard('register-passkey', 'user', true) // User is trying to register a passkey for themselves
  async getPasskeyRegistrationOptions(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Guard handles auth
  ): Promise<PasskeyRegistrationOptionsResponseDto> {
    const options = await this.securityService.generatePasskeyRegistrationOptions(userId);
    return {
      code: 200,
      message: 'Generated passkey registration options successfully.',
      data: { options: options as any }, // Type assertion if needed by client
    };
  }

  @Post('passkeys')
  @Guard('register-passkey', 'user', true)
  async verifyPasskeyRegistration(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Body() body: PasskeyRegistrationVerifyRequestDto,
    // @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<PasskeyRegistrationVerifyResponseDto> {
    await this.securityService.verifyPasskeyRegistration(userId, body.response);
    return {
      code: 201,
      message: 'Passkey registered successfully.',
    };
  }

  @Get('passkeys')
  @Guard('enumerate-passkeys', 'user') // User is querying their own passkeys
  async getUserPasskeys(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    // @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<GetPasskeysResponseDto> {
    const passkeysFromService = await this.securityService.getUserPasskeys(userId);
    return {
      code: 200,
      message: 'Query passkeys successfully.',
      data: {
        passkeys: passkeysFromService.map((p) => ({
          id: p.credentialId, // Ensure this matches PasskeyInfo interface
          createdAt: p.createdAt,
          deviceType: p.deviceType,
          backedUp: p.backedUp,
        })),
      },
    };
  }

  @Delete('passkeys/:credentialId')
  @Guard('delete-passkey', 'user', true) // User is deleting their own passkey
  async deletePasskey(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Param('credentialId') credentialId: string,
    // @Headers('Authorization') @AuthToken() auth: string | undefined,
  ): Promise<DeletePasskeyResponseDto> {
    await this.securityService.deletePasskey(userId, credentialId);
    return {
      code: 200,
      message: 'Delete passkey successfully.',
    };
  }

  // --- 2FA Management ---
  @Post('2fa/enable')
  @Guard('modify-2fa', 'user', true)
  async enable2FA(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Enable2FARequestDto, // Contains optional code and secret
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Enable2FAResponseDto> {
    if (!dto.code) { // Initial step: generate secret
      const user = await this.usersServiceOriginal.findUserRecordOrThrow(userId); // TODO: Replace with AccountService
      const secret = await this.totpService.generateTOTPSecret();
      const otpauthUrl = this.totpService.generateTOTPUri(secret, user.username);
      const qrcodeData = await qrcode.toDataURL(otpauthUrl);
      // Store secret temporarily (e.g., in user's session or encrypted cookie) for verification step
      // Or, client must send it back. The DTO expects optional secret.
      // For now, let's assume client sends it back.
      return {
        code: 200,
        message: 'TOTP secret generated. Please verify to enable.',
        data: { secret, otpauth_url: otpauthUrl, qrcode, backup_codes: [] }, // No backup codes yet
      };
    } else { // Verification step
      if (!dto.secret) throw new Error('Secret is required for 2FA verification step.');
      const backupCodes = await this.securityService.enableTOTP(userId, dto.secret, dto.code);
      const user = await this.usersServiceOriginal.findUserRecordOrThrow(userId); // TODO: Replace with AccountService
      const otpauthUrl = this.totpService.generateTOTPUri(dto.secret, user.username); // Re-generate for response consistency
      const qrcodeData = await qrcode.toDataURL(otpauthUrl); // Re-generate for response consistency

      return {
        code: 201,
        message: '2FA enabled successfully.',
        data: { secret: dto.secret, otpauth_url: otpauthUrl, qrcode: qrcodeData, backup_codes: backupCodes },
      };
    }
  }

  @Post('2fa/disable')
  @HttpCode(200)
  @Guard('modify-2fa', 'user', true)
  async disable2FA(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Disable2FARequestDto, // May be empty if sudo is sufficient
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Disable2FAResponseDto> {
    await this.securityService.disableTOTP(userId);
    return { code: 200, message: '2FA disabled successfully.', data: { success: true } };
  }

  @Post('2fa/backup-codes')
  @Guard('modify-2fa', 'user', true)
  async generateBackupCodes(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: GenerateBackupCodesRequestDto, // May be empty
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<GenerateBackupCodesResponseDto> {
    const backupCodes = await this.securityService.generateNewBackupCodes(userId);
    return { code: 201, message: 'New backup codes generated successfully.', data: { backup_codes: backupCodes } };
  }

  @Get('2fa/status')
  @Guard('query', 'user') // User querying their own 2FA status
  async get2FAStatus(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Get2FAStatusResponseDto> {
    // This logic was simple enough to be in controller, but for consistency, moved to service.
    const status = await this.securityService.get2FAStatus(userId);
    return { code: 200, message: 'Get 2FA status successfully.', data: status };
  }

  @Put('2fa/settings')
  @Guard('modify-2fa', 'user', true)
  async update2FASettings(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Body() dto: Update2FASettingsRequestDto,
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<Update2FASettingsResponseDto> {
    await this.securityService.update2FASettings(userId, dto.always_required);
    return { code: 200, message: '2FA settings updated successfully.', data: { success: true, always_required: dto.always_required } };
  }

  // --- OAuth Connection Management ---
  @Post('oauth/bind/:providerId') // Path: /users/:userId/security/oauth/bind/:providerId
  @Guard('modify-oauth', 'user', true)
  async bindOAuth(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Param('providerId') providerId: string,
    @Body() dto: OAuthBindRequestDto,
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<OAuthBindResponseDto> {
    const bindUrl = await this.securityService.initOAuthBinding(userId, providerId, dto.state);
    return {
      code: 200,
      message: 'OAuth binding initialized. Redirect user to the provided URL.',
      data: { success: true, provider: providerId, bindUrl },
    };
  }

  @Get('oauth/connections')
  @Guard('query-oauth', 'user')
  async getUserOAuthConnections(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<GetUserOAuthConnectionsResponseDto> {
    const connections = await this.securityService.getUserOAuthConnections(userId);
    return { code: 200, message: 'Get OAuth connections successfully.', data: { connections } };
  }

  @Delete('oauth/connections/:connectionId')
  @Guard('modify-oauth', 'user', true)
  async unbindOAuth(
    @Param('userId', ParseIntPipe) @ResourceId() userId: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
    // @Headers('Authorization') @AuthToken() auth: string,
  ): Promise<UnbindOAuthResponseDto> {
    await this.securityService.unbindOAuth(userId, connectionId);
    return { code: 200, message: 'OAuth connection unbound successfully.', data: { success: true, unboundConnectionId: connectionId } };
  }
}

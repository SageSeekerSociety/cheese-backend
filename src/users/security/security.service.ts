/*
 *  Description: This file implements the SecurityService for user security settings management.
 *               It handles Passkey registration, 2FA management, and OAuth connection management.
 */

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Passkey, User } from '@prisma/client'; // Assuming User might be needed for context
import {
  RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  generateRegistrationOptions,
  verifyRegistrationResponse,
  CredentialDeviceType,
  WebAuthnCredential,
} from '@simplewebauthn/server';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TOTPService } from '../totp.service'; // For 2FA logic
import { UserChallengeRepository } from '../user-challenge.repository'; // For Passkey challenges
import { OAuthService } from '../../auth/oauth/oauth.service'; // For OAuth binding URL generation
import { OAuthUserInfo } from '../../auth/oauth/oauth.types'; // For OAuth binding callback

import crypto from 'node:crypto'; // For OAuth binding state generation

// Errors
import { ChallengeNotFoundError, PasskeyVerificationFailedError } from '../auth/errors/auth.error';
import { UserIdNotFoundError } from '../account/errors/account.error';
import {
  TOTPAlreadyEnabledError,
  TOTPNotEnabledError,
  // InvalidBackupCodeError, // Not used yet, but could be if backup code verification is added here
  OAuthConnectionNotFoundError,
  OAuthProviderAlreadyLinkedError,
  CannotUnbindLastLoginMethodError,
} from './errors/security.error';

// DTOs - Not directly used in service method signatures but good for context.

import { AccountService } from '../account/account.service';


@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  // private readonly redis: Redis; // If needed for specific caching here, beyond UserChallengeRepository

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly totpService: TOTPService,
    private readonly userChallengeRepository: UserChallengeRepository, // For Passkey and potentially OAuth binding state
    private readonly oauthService: OAuthService,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
  ) {}

  private get rpName(): string {
    return this.configService.get('webauthn.rpName') ?? 'Cheese Community';
  }

  private get rpID(): string {
    return this.configService.get('webauthn.rpID') ?? 'localhost';
  }

  private get origin(): string {
    return this.configService.get('webauthn.origin') ?? 'http://localhost:7777';
  }

  // --- Passkey Management ---
  async generatePasskeyRegistrationOptions(userId: number): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.accountService.findUserRecordOrThrow(userId);
    const existingPasskeys = await this.prismaService.passkey.findMany({ where: { userId } });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.username, // username from User record
      userID: Buffer.from(user.id.toString()), // SimpleWebAuthn expects Buffer for userID
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId, // Already a string from DB
        type: 'public-key', // Required by spec
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      })),
      timeout: 60000,
    });
    await this.userChallengeRepository.setChallenge(userId, options.challenge, 600);
    return options;
  }

  async verifyPasskeyRegistration(userId: number, response: RegistrationResponseJSON): Promise<void> {
    const challenge = await this.userChallengeRepository.getChallenge(userId);
    if (!challenge) throw new ChallengeNotFoundError();

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: false, // Adjust as needed
    });

    if (!verified || !registrationInfo) throw new PasskeyVerificationFailedError();
    const { credential, credentialBackedUp, credentialDeviceType } = registrationInfo;
    await this.savePasskeyCredential(userId, credential, credentialDeviceType, credentialBackedUp);
    await this.userChallengeRepository.deleteChallenge(userId);
  }

  private async savePasskeyCredential(
    userId: number, credential: WebAuthnCredential,
    deviceType: CredentialDeviceType, backedUp: boolean,
  ): Promise<void> {
    await this.prismaService.passkey.create({
      data: {
        userId,
        credentialId: credential.id, // Store as string
        publicKey: credential.publicKey, // Store as Buffer
        counter: credential.counter,
        deviceType,
        backedUp,
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
      },
    });
  }

  async getUserPasskeys(userId: number): Promise<Passkey[]> {
    return this.prismaService.passkey.findMany({ where: { userId } });
  }

  async deletePasskey(userId: number, credentialId: string): Promise<void> {
    const result = await this.prismaService.passkey.deleteMany({ where: { userId, credentialId } });
    if (result.count === 0) {
      // Consider if this should throw an error if passkey not found for this user
      this.logger.warn(`Attempted to delete non-existent passkey (ID: ${credentialId}) for user ${userId}`);
    }
  }

  // --- TOTP (2FA) Management ---
  async enableTOTP(userId: number, secret: string, code: string): Promise<string[]> {
    const user = await this.accountService.findUserRecordOrThrow(userId);
    if (user.totpEnabled) throw new TOTPAlreadyEnabledError(userId);

    return this.totpService.enable2FA(userId, secret, code); // TOTPService handles verification and saving
  }

  async disableTOTP(userId: number): Promise<void> {
    // Optional: verify current TOTP or password via Sudo before disabling
    // This is handled by the Guard in the controller.
    const user = await this.accountService.findUserRecordOrThrow(userId);
    if (!user.totpEnabled) throw new TOTPNotEnabledError(userId);
    await this.totpService.disable2FA(userId);
  }

  async generateNewBackupCodes(userId: number): Promise<string[]> {
    const user = await this.accountService.findUserRecordOrThrow(userId);
    if (!user.totpEnabled) throw new TOTPNotEnabledError(userId);
    return this.totpService.generateAndSaveBackupCodes(userId);
  }

  async get2FAStatus(userId: number): Promise<{ enabled: boolean; has_passkey: boolean; always_required: boolean }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpAlwaysRequired: true, passkeys: { select: { id: true } } },
    });
    if (!user) throw new UserIdNotFoundError(userId);
    return { enabled: user.totpEnabled, has_passkey: user.passkeys.length > 0, always_required: user.totpAlwaysRequired };
  }

  async update2FASettings(userId: number, alwaysRequired: boolean): Promise<void> {
    await this.accountService.findUserRecordOrThrow(userId); // Ensure user exists
    await this.prismaService.user.update({
      where: { id: userId },
      data: { totpAlwaysRequired: alwaysRequired },
    });
  }

  // --- OAuth Connection Management ---
  async initOAuthBinding(userId: number, providerId: string, clientState?: string): Promise<string> {
    await this.accountService.findUserRecordOrThrow(userId); // Ensure user exists
    // Generate a temporary state for this binding attempt, store it with userId and providerId mapping
    // This state will be passed to OAuth provider and received back in callback
    const bindingSessionId = crypto.randomBytes(16).toString('hex');
    const bindingState = `binding:${bindingSessionId}${clientState ? `:${clientState}` : ''}`;

    // Using a namespaced challenge for OAuth binding to avoid collision with passkey challenges
    const challengeValue = `oauthbind_${providerId}_${userId}_${bindingSessionId}`;
    await this.userChallengeRepository.setChallenge(userId, challengeValue, 15 * 60);

    return this.oauthService.generateAuthorizationUrl(providerId, bindingState);
  }

  async handleOAuthBindingCallback(userId: number, providerId: string, bindingSessionIdFromState: string, oauthUserInfo: OAuthUserInfo): Promise<void> {
    const challengeValue = `oauthbind_${providerId}_${userId}_${bindingSessionIdFromState}`;
    // Verify challenge by trying to get it; if it exists for this user, it's valid.
    // UserChallengeRepository.getChallenge(userId) returns the challenge string if it exists.
    const storedChallenge = await this.userChallengeRepository.getChallenge(userId);

    if (!storedChallenge || storedChallenge !== challengeValue) {
      throw new Error('Invalid or expired OAuth binding session.');
    }
    // Challenge is valid, consume it
    await this.userChallengeRepository.deleteChallenge(userId);

    const existingConnectionForProviderUser = await this.prismaService.userOAuthConnection.findUnique({
        where: { providerId_providerUserId: { providerId, providerUserId: oauthUserInfo.id } },
    });

    if (existingConnectionForProviderUser) {
        if (existingConnectionForProviderUser.userId === userId) {
            // Already linked to this user, perhaps update rawProfile
            await this.prismaService.userOAuthConnection.update({
                where: { id: existingConnectionForProviderUser.id },
                data: { rawProfile: oauthUserInfo as any, updatedAt: new Date() },
            });
            return; // Or throw "already linked"
        } else {
            // Linked to a different user
            throw new OAuthProviderAlreadyLinkedError(providerId); // Or a more generic "OAuth account in use"
        }
    }

    // Check if this user (userId) already has a connection for this providerId (but different providerUserId)
    const existingConnectionForUserAndProvider = await this.prismaService.userOAuthConnection.findFirst({
        where: { userId, providerId },
    });
    if (existingConnectionForUserAndProvider) {
        // User already has an account from this provider, but it's a different one.
        // Policy might be to disallow multiple accounts from same provider or allow it.
        // For now, let's assume one account per provider per user.
        throw new OAuthProviderAlreadyLinkedError(providerId);
    }

    // Create new connection
    await this.prismaService.userOAuthConnection.create({
        data: { userId, providerId, providerUserId: oauthUserInfo.id, rawProfile: oauthUserInfo as any },
    });
  }

  async getUserOAuthConnections(userId: number): Promise<Array<{
    id: number; providerId: string; providerName: string; providerUserId: string; connectedAt: string;
  }>> {
    const connections = await this.prismaService.userOAuthConnection.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' },
    });
    const providerConfigs = this.configService.get<any[]>('oauth.providers', []);
    const providerNameMap = providerConfigs.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    return connections.map(conn => ({
      id: conn.id,
      providerId: conn.providerId,
      providerName: providerNameMap[conn.providerId] || conn.providerId,
      providerUserId: conn.providerUserId,
      connectedAt: conn.createdAt.toISOString(),
    }));
  }

  async unbindOAuth(userId: number, connectionId: number): Promise<void> {
    const connection = await this.prismaService.userOAuthConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) throw new OAuthConnectionNotFoundError(connectionId);

    // Check if this is the last login method (e.g., no password set and this is the only OAuth)
    const totalConnections = await this.prismaService.userOAuthConnection.count({ where: { userId } });
    const user = await this.accountService.findUserRecordOrThrow(userId);
    if (!user.hashedPassword && !user.srpSalt && totalConnections <= 1) { // Also check for passkeys if they are a login method
        const passkeyCount = await this.prismaService.passkey.count({ where: { userId }});
        if (passkeyCount === 0) {
            throw new CannotUnbindLastLoginMethodError();
        }
    }
    await this.prismaService.userOAuthConnection.delete({ where: { id: connectionId } });
  }
}

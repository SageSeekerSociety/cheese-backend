/*
 *  Description: This file implements the AuthService for user authentication.
 *               It is responsible for the business logic of user authentication.
 *
 */

import { RedisService } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  User,
  UserFollowingRelationship, // Will be removed
  UserProfile, // Will be removed unless UserDto construction stays here briefly
  UserRegisterLogType, // Will be removed
  UserResetPasswordLogType, // Will be removed
} from '@prisma/client';
import {
  AuthenticationResponseJSON,
  // CredentialDeviceType, // For passkey registration, belongs to security/account
  // RegistrationResponseJSON, // For passkey registration
  // WebAuthnCredential, // For passkey registration
  generateAuthenticationOptions,
  // generateRegistrationOptions, // For passkey registration
  verifyAuthenticationResponse,
  // verifyRegistrationResponse, // For passkey registration
} from '@simplewebauthn/server';
import bcrypt from 'bcryptjs';
// import { isEmail } from 'class-validator'; // For registration/account
import { Request } from 'express';
import Redis from 'ioredis';
// import assert from 'node:assert'; // For follow logic
import crypto from 'node:crypto';
// import { AnswerService } from '../../answer/answer.service'; // User content
// Removed: import { InvalidCredentialsError } from '../../auth/auth.error'; // Now using local InvalidLoginCredentialsError or specific auth errors
import { AuthService as SharedAuthService } from '../../auth/auth.service';
import { Authorization } from '../../auth/definitions';
import { OAuthUserInfo } from '../../auth/oauth/oauth.types';
import { SessionService } from '../../auth/session.service';
// import { AvatarNotFoundError } from '../../avatars/avatars.error'; // Account
// import { AvatarsService } from '../../avatars/avatars.service'; // Account
// import { PageDto } from '../../common/DTO/page-response.dto'; // For listing things
// import { PageHelper } from '../../common/helper/page.helper'; // For listing things
import { PrismaService } from '../../common/prisma/prisma.service';
// import { EmailRuleService } from '../../email/email-rule.service'; // Account
// import { EmailService } from '../../email/email.service'; // Account
// import { QuestionsService } from '../../questions/questions.service'; // User content
import { OAuthUserDto } from '../DTO/oauth.dto'; // Keep for now, might be split. TODO: Adjust path if it moves
import { UserDto } from '../DTO/user.dto'; // Keep for now. TODO: Adjust path if it moves
import { SrpService } from '../srp.service';
import { TOTPService } from '../totp.service';
import { UserChallengeRepository } from '../user-challenge.repository';
import { UsersPermissionService } from '../users-permission.service';
// import { UsersRegisterRequestService } from '../users-register-request.service'; // Account

import {
  ChallengeNotFoundError,
  InvalidLoginCredentialsError, // Local auth error
  PasskeyNotFoundError,
  PasskeyVerificationFailedError,
  PasswordNotMatchError,
  SrpNotUpgradedError,
  SrpVerificationError,
  TOTPInvalidError,
  TOTPRequiredError,
  TOTPTempTokenInvalidError,
  OAuthSrpVerificationRequiredError,
  OAuthLegacyPasswordRequiredError,
  // OAuthAccountChoiceRequiredError, // This might be more of a account linking/security concern
} from './errors/auth.error'; // Corrected path

// Errors that will be from other modules later
// TODO: These should eventually be imported from ../account/errors/account.error or similar
import { UserIdNotFoundError, UsernameNotFoundError } from '../users.error';

// const USER_PROFILE_UPDATE_CHANNEL = 'cache:user:updated'; // Account related

@Injectable()
export class AuthService { // Renamed from UsersService to AuthService
  private readonly logger = new Logger(AuthService.name); // Updated logger name
  private readonly redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    // private readonly emailService: EmailService, // To be removed or injected if needed for auth notifications
    // private readonly emailRuleService: EmailRuleService, // To be removed
    private readonly sharedAuthService: SharedAuthService, // Renamed to avoid conflict
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userChallengeRepository: UserChallengeRepository,
    private readonly usersPermissionService: UsersPermissionService,
    // private readonly usersRegisterRequestService: UsersRegisterRequestService, // To be removed
    // private readonly avatarsService: AvatarsService, // To be removed
    // @Inject(forwardRef(() => AnswerService))
    // private readonly answerService: AnswerService, // To be removed
    // @Inject(forwardRef(() => QuestionsService))
    // private readonly questionsService: QuestionsService, // To be removed
    private readonly prismaService: PrismaService,
    private readonly totpService: TOTPService,
    private readonly srpService: SrpService,
    // Temporary: For getUserDtoById. This dependency needs to be broken.
    // AccountService will provide UserDto. AuthService will take userId and enrich with auth details.
    // For now, we inject the original UsersService which will be refactored into AccountService etc.
    @Inject(forwardRef(() => AccountService)) // Dependency on AccountService for some user details
    private readonly accountService: AccountService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  // private readonly passwordResetEmailValidSeconds = 10 * 60; // Belongs to account/reset-password service

  private get rpName(): string {
    return this.configService.get('webauthn.rpName') ?? 'Cheese Community';
  }

  private get rpID(): string {
    return this.configService.get('webauthn.rpID') ?? 'localhost';
  }

  private get origin(): string {
    return this.configService.get('webauthn.origin') ?? 'http://localhost:7777';
  }

  // generateVerifyCode(): string // Belongs to account/register service
  // emailSuffixRule(): string // Belongs to account/register service
  // generatePasskeyRegistrationOptions // Belongs to security service
  // verifyPasskeyRegistration // Belongs to security service
  // savePasskeyCredential // Belongs to security service

  async generatePasskeyAuthenticationOptions(
    req: Request,
    userId?: number,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    if (!userId) {
      const options = await generateAuthenticationOptions({
        rpID: this.rpID,
        allowCredentials: [],
        userVerification: 'preferred',
      });
      req.session.passkeyChallenge = options.challenge;
      return options;
    }
    const passkeys = await this.prismaService.passkey.findMany({
      where: { userId },
    });
    const allowCredentials = passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports
        ? JSON.parse(passkey.transports)
        : undefined,
    }));

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials,
      userVerification: 'preferred',
    });
    req.session.passkeyChallenge = options.challenge;
    return options;
  }

  async verifyPasskeyAuthentication(
    req: Request,
    response: AuthenticationResponseJSON,
  ): Promise<boolean> {
    const challenge = req.session.passkeyChallenge;
    if (challenge == null) {
      throw new ChallengeNotFoundError();
    }

    const authenticator = await this.prismaService.passkey.findFirst({
      where: { credentialId: response.id },
    });
    if (authenticator == null) {
      throw new PasskeyNotFoundError(response.id);
    }

    const { verified, authenticationInfo } = await verifyAuthenticationResponse(
      {
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: authenticator.credentialId,
          publicKey: authenticator.publicKey,
          counter: authenticator.counter,
          transports: authenticator.transports
            ? JSON.parse(authenticator.transports)
            : undefined,
        },
        requireUserVerification: false,
      },
    );

    if (!verified || authenticationInfo == null) {
      return false; // Or throw PasskeyVerificationFailedError directly
    }

    await this.prismaService.passkey.update({
      where: { id: authenticator.id },
      data: { counter: authenticationInfo.newCounter },
    });
    return true;
  }

  async handlePasskeyLogin(
    userId: number,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[UserDto, string]> { // UserDto might change to a simpler AuthUser type
    await this.prismaService.userLoginLog.create({
      data: { userId: userId, ip, userAgent },
    });
    // AuthService will return minimal user info needed for the auth flow.
    // The controller will call AccountService if full UserDto is needed for response.
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) throw new UserIdNotFoundError(userId);

    // Return essential user info for the AuthController to then fetch full DTO if needed
    return [
      { id: user.id, username: user.username, email: user.email }, // Example minimal info
      await this.createSession(userId),
    ];
  }

  // getUserPasskeys // Belongs to security service
  // deletePasskey // Belongs to security service
  // isEmailRegistered // Belongs to account service
  // findUserRecordOrThrow // Belongs to account service (or a shared user data access layer)
  // findUserRecordByUsernameOrThrow // Belongs to account service
  // findUserRecordAndProfileRecordOrThrow // Belongs to account service

  // isUsernameRegistered // Belongs to account service
  // createUserRegisterLog // Belongs to account service
  // createPasswordResetLog // Belongs to account service
  // sendRegisterEmailCode // Belongs to account service
  // isValidUsername, usernameRule // Belongs to account service
  // isValidNickname, nicknameRule // Belongs to account service
  // isValidPassword, passwordRule // Belongs to account service (validation for registration/change)
  // defaultIntro // Belongs to account service
  // register // Belongs to account service
  // getUserDtoById // Belongs to account service
  // getUsersDtoByIds // Belongs to account service
  // getOAuthUserDtoById // Belongs to account service, or Auth Service if it constructs its own OAuthUser DTO

  private async authenticateUserWithPassword(
    user: User, // Use Prisma User type
    username: string,
    password: string,
    autoUpgradeToSrp: boolean = true,
  ): Promise<{ verified: boolean; wasUpgraded: boolean }> {
    if (!user.hashedPassword) { // User might be SRP only or OAuth only
        return { verified: false, wasUpgraded: false };
    }
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return { verified: false, wasUpgraded: false };
    }

    let wasUpgraded = false;
    if (!user.srpUpgraded && autoUpgradeToSrp) {
      // Ensure srpService is available
      await this.srpService.upgradeUserToSrp(user.id, username, password);
      wasUpgraded = true;
    }
    return { verified: true, wasUpgraded };
  }

  // determineOAuthAuthStrategy - this is part of the OAuth flow initiation, keep here.
  private determineOAuthAuthStrategy(
    user: User | null,
  ): 'srp' | 'legacy_password' | 'create_new' {
    if (!user) {
      return 'create_new';
    }
    if (user.srpUpgraded && user.srpSalt && user.srpVerifier) {
      return 'srp';
    }
    return 'legacy_password';
  }

  async login(
    username: string,
    password: string,
    ip: string,
    userAgent: string | undefined,
    isLegacyAuth: boolean = false, // This flag might become obsolete if SRP is default
  ): Promise<[UserDto, string]> { // UserDto might change
    return this.secureLogin(username, password, ip, userAgent, isLegacyAuth);
  }

  private async secureLogin(
    username: string,
    password: string,
    ip: string,
    userAgent: string | undefined,
    isLegacyAuth: boolean = false,
  ): Promise<[UserDto, string]> { // UserDto might change
    let user: User | null = null;
    let userExists = false;

    try {
      user = await this.prismaService.user.findUnique({ where: { username } });
      userExists = !!user;
    } catch {
      userExists = false;
    }

    let verified = false;
    if (userExists && user) {
        if (user.hashedPassword) { // Check if password auth is even possible
            const { verified: authResult } = await this.authenticateUserWithPassword(
                user,
                username,
                password,
                !isLegacyAuth, // Auto-upgrade to SRP if not legacy
            );
            verified = authResult;
        }
    } else {
      await bcrypt.compare(
        password,
        '$2a$10$N9qo8uLOickgx2ZMRZoMye.IUlKdJvQq1iRgMZdRJUjN1zF4JTqSK', // Dummy hash
      );
    }

    if (!verified || !userExists || !user) { // Added !user check for type safety
      throw new InvalidLoginCredentialsError();
    }

    if (user.totpEnabled) {
      const requireTOTP = await this.shouldRequire2FA(user.id, ip, userAgent);
      if (requireTOTP) {
        const tempToken = this.totpService.generateTempToken(user.id);
        throw new TOTPRequiredError(username, tempToken);
      }
    }

    await this.prismaService.userLoginLog.create({
      data: { userId: user.id, ip, userAgent },
    });
    // Return essential user info
    return [
      { id: user.id, username: user.username, email: user.email, totpEnabled: user.totpEnabled, srpUpgraded: user.srpUpgraded },
      await this.createSession(user.id),
    ];
  }

  private async shouldRequire2FA(
    userId: number,
    ip: string,
    userAgent: string | undefined,
  ): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { totpAlwaysRequired: true },
    });
    if (user?.totpAlwaysRequired) return true;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const isKnownIP = await this.prismaService.userLoginLog.findFirst({
      where: { userId, ip, createdAt: { gte: thirtyDaysAgo } },
    });
    const isKnownDevice = userAgent && await this.prismaService.userLoginLog.findFirst({
      where: { userId, userAgent, createdAt: { gte: thirtyDaysAgo } },
    });

    if (!isKnownIP || !isKnownDevice) return true;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hasSensitiveOperation = await this.prismaService.userResetPasswordLog.findFirst({
      where: { userId, createdAt: { gte: twentyFourHoursAgo } },
    });
    return !!hasSensitiveOperation;
  }

  async verifyTOTPAndLogin(
    tempToken: string,
    code: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[UserDto, string, boolean]> { // UserDto might change
    try {
      const auth = this.sharedAuthService.verify(tempToken); // Use sharedAuthService
      const userId = auth.userId;
      await this.sharedAuthService.audit(tempToken, 'verify', userId, 'users/totp:verify'); // Use sharedAuthService

      const { isValid, usedBackupCode } = await this.totpService.verify2FA(userId, code);
      if (!isValid) {
        throw new TOTPInvalidError();
      }

      await this.prismaService.userLoginLog.create({ data: { userId, ip, userAgent } });
      // const userDto = await this.usersServiceOriginal.getUserDtoById(userId, userId, ip, userAgent);
      const user = await this.prismaService.user.findUnique({ where: {id: userId}});
      if(!user) throw new UserIdNotFoundError(userId);

      return [
        {id: user.id, username: user.username, email: user.email }, // Minimal info
        await this.createSession(userId),
        usedBackupCode,
      ];
    } catch (error) {
      if (error instanceof TOTPInvalidError) throw error;
      this.logger.error(`verifyTOTPAndLogin failed: ${error}`);
      throw new TOTPTempTokenInvalidError();
    }
  }

  private async createSession(userId: number): Promise<string> {
    const authorization: Authorization =
      await this.usersPermissionService.getAuthorizationForUser(userId);
    return this.sessionService.createSession(userId, authorization);
  }

  // sendResetPasswordEmail // Belongs to account service
  // verifyAndResetPassword // Belongs to account service
  // updateUserProfile // Belongs to account service
  // getUniqueFollowRelationship // Belongs to relationships service
  // addFollowRelationship // Belongs to relationships service
  // deleteFollowRelationship // Belongs to relationships service
  // getFollowers // Belongs to relationships service
  // getFollowees // Belongs to relationships service
  // isUserExists // Belongs to account service (or shared user data access)
  // getFollowingCount // Belongs to relationships service
  // getFollowedCount // Belongs to relationships service
  // isUserFollowUser // Belongs to relationships service

  async verifySudo(
    req: Request, // Express Request
    token: string,
    method: 'password' | 'srp' | 'passkey' | 'totp',
    credentials: {
      password?: string;
      clientPublicEphemeral?: string;
      clientProof?: string;
      passkeyResponse?: AuthenticationResponseJSON; // from @simplewebauthn/server
      code?: string;
    },
  ): Promise<{
    accessToken: string;
    salt?: string;
    serverPublicEphemeral?: string;
    serverProof?: string;
    srpUpgraded?: boolean;
  }> {
    const userId = this.sharedAuthService.decode(token).authorization.userId;
    let verified = false;
    let srpUpgraded = false;
    let serverProof: string | undefined = undefined;
    let salt: string | undefined = undefined;
    let serverPublicEphemeral: string | undefined = undefined;

    const user = await this.prismaService.user.findUnique({ where: {id: userId }});
    if (!user) throw new UserIdNotFoundError(userId);


    if (method === 'password') {
      if (!credentials.password) throw new Error('Password is required for password verification');
      const result = await this.authenticateUserWithPassword(user, user.username, credentials.password, true);
      verified = result.verified;
      srpUpgraded = result.wasUpgraded; // Capture if SRP upgrade happened
    } else if (method === 'srp') {
      if (!user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
        throw new SrpNotUpgradedError(user.username);
      }
      salt = user.srpSalt;

      if (!credentials.clientProof && !credentials.clientPublicEphemeral) {
        const srpSessionData = await this.srpService.createServerSession(user.srpVerifier!); // Added non-null assertion
        req.session.srpSession = { serverSecretEphemeral: srpSessionData.serverEphemeral.secret };
        serverPublicEphemeral = srpSessionData.serverEphemeral.public;
        return { accessToken: token, salt, serverPublicEphemeral, srpUpgraded: user.srpUpgraded }; // Return current srpUpgraded status
      } else if (credentials.clientProof && credentials.clientPublicEphemeral) {
        const sessionState = req.session.srpSession;
        if (!sessionState) throw new Error('SRP session not found. Please initialize first.');

        const srpResult = await this.srpService.verifyClient(
          sessionState.serverSecretEphemeral,
          credentials.clientPublicEphemeral,
          user.srpSalt!, // Added non-null assertion
          user.username,
          user.srpVerifier!, // Added non-null assertion
          credentials.clientProof,
        );
        verified = srpResult.success;
        serverProof = srpResult.serverProof; // Capture serverProof
        delete req.session.srpSession;
        if (!verified) throw new SrpVerificationError();
      } else {
        throw new Error('Invalid SRP credentials for sudo');
      }
    } else if (method === 'passkey') {
      if (!credentials.passkeyResponse) throw new Error('Passkey response is required');
      verified = await this.verifyPasskeyAuthentication(req, credentials.passkeyResponse);
    } else if (method === 'totp') {
      if (!credentials.code) throw new Error('TOTP code is required');
      const totpResult = await this.totpService.verify2FA(userId, credentials.code!); // Added non-null assertion
      verified = totpResult.isValid;
    }

    if (!verified) {
      throw new InvalidLoginCredentialsError(); // Changed from InvalidCredentialsError to be specific
    }

    const sudoToken = await this.sharedAuthService.issueSudoToken(token);
    // Include all relevant fields in the return, srpUpgraded reflects state *after* this operation if password was used.
    return { accessToken: sudoToken, salt, serverPublicEphemeral, serverProof, srpUpgraded };
  }

  async handleSrpInit(username: string): Promise<{
    salt: string;
    serverPublicEphemeral: string;
    serverSecretEphemeral: string; // This should not be sent to client; used for session
  }> {
    const user = await this.prismaService.user.findUnique({ where: { username } });
    if (!user || !user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
      throw new InvalidLoginCredentialsError(); // Or SrpNotUpgradedError if user exists but not SRP
    }
    const { serverEphemeral } = await this.srpService.createServerSession(user.srpVerifier);
    return {
      salt: user.srpSalt,
      serverPublicEphemeral: serverEphemeral.public,
      serverSecretEphemeral: serverEphemeral.secret, // Important for verify step
    };
  }

  async handleSrpVerify(
    username: string,
    clientPublicEphemeral: string,
    clientProof: string,
    serverSecretEphemeral: string, // Passed from session/init step
    ip: string,
    userAgent: string | undefined,
  ): Promise<{
    serverProof: string;
    accessToken: string;
    requires2FA: boolean;
    tempToken?: string;
    user?: UserDto; // UserDto might change
  }> {
    const user = await this.prismaService.user.findUnique({ where: { username } });
    if (!user || !user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
      throw new InvalidLoginCredentialsError(); // Or SrpNotUpgradedError
    }

    const { success, serverProof } = await this.srpService.verifyClient(
      serverSecretEphemeral,
      clientPublicEphemeral,
      user.srpSalt,
      username,
      user.srpVerifier,
      clientProof,
    );

    if (!success) {
      throw new SrpVerificationError(); // Or InvalidLoginCredentialsError
    }

    await this.prismaService.userLoginLog.create({ data: { userId: user.id, ip, userAgent } });
    // const userDto = await this.usersServiceOriginal.getUserDtoById(user.id, user.id, ip, userAgent);
    const minimalUser = {id: user.id, username: user.username, email: user.email};

    if (user.totpEnabled) {
      const requireTOTP = await this.shouldRequire2FA(user.id, ip, userAgent);
      if (requireTOTP) {
        const tempToken = this.totpService.generateTempToken(user.id);
        return { serverProof, accessToken: '', requires2FA: true, tempToken, user: minimalUser };
      }
    }
    const accessToken = await this.createSession(user.id);
    return { serverProof, accessToken, requires2FA: false, user: minimalUser };
  }

  // createSessionForNewUser: This is called after registration. Registration is in AccountService.
  // AccountService can call this AuthService.createSession(userId) or AuthService can expose a more specific method.
  // For now, let's assume AccountService will call `this.authService.createSession(newUser.id)`.
  // So, this method can be removed from here if not used by other auth flows.
  // However, it's just a wrapper around createSession, so it can stay if it simplifies calls from AccountService.
  // Let's keep it for now.
  async createSessionForNewUser(userId: number): Promise<string> {
    return this.createSession(userId);
  }


  // changePassword // Belongs to account service

  // --- OAuth Specific Methods ---
  // These are complex and form a significant part of auth.
  // They will stay in this AuthService.

  async initiateOAuthFlow(
    providerId: string,
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<
    | [OAuthUserDto, string]
    | {
        requiresVerification: true;
        verificationType: 'password' | 'srp';
        email: string;
        sessionId: string;
        salt?: string;
        serverPublicEphemeral?: string;
      }
    | {
        requiresDecision: true; // Client needs to decide: create new or link to existing
        stateToken: string; // Token containing OAuth info for client to make decision
      }
  > {
    const existingConnection = await this.prismaService.userOAuthConnection.findUnique({
      where: { providerId_providerUserId: { providerId, providerUserId: userInfo.id } },
      include: { user: { include: { userProfile: true } } },
    });

    if (existingConnection) {
      return this.handleExistingOAuthConnection(existingConnection, userInfo, ip, userAgent);
    }

    if (userInfo.email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: userInfo.email },
        // include: { userProfile: true }, // Not strictly needed here
      });

      if (existingUser && !existingUser.deletedAt) {
        if (existingUser.srpUpgraded) {
          return this.initOAuthSrpVerification(providerId, userInfo, existingUser);
        } else {
          return this.initOAuthPasswordVerification(providerId, userInfo, existingUser);
        }
      }
    }

    // No existing connection, no email conflict (or no email provided by OAuth)
    // Client needs to decide whether to create a new account or link to an existing one (if they log in separately)
    const stateToken = await this.generateOAuthStateToken(providerId, userInfo, ip, userAgent);
    return {
      requiresDecision: true,
      stateToken,
    };
  }

  private async initOAuthPasswordVerification(
    providerId: string,
    userInfo: OAuthUserInfo,
    existingUser: User, // Prisma User
  ): Promise<{
    requiresVerification: true;
    verificationType: 'password';
    email: string; // email of the existingUser
    sessionId: string; // session ID for this verification attempt
  }> {
    const sessionId = this.generateOAuthSessionId('password', providerId, userInfo.id);
    const sessionData = {
      type: 'password',
      providerId,
      userInfo,
      existingUserId: existingUser.id,
      existingUsername: existingUser.username,
    };
    await this.redis.setex(`oauth_session:${sessionId}`, 15 * 60, JSON.stringify(sessionData));
    if (!existingUser.email) {
        throw new Error("Existing user for OAuth password verification has no email."); // Should not happen if matched by email
    }
    return {
      requiresVerification: true,
      verificationType: 'password',
      email: existingUser.email,
      sessionId,
    };
  }

  private async initOAuthSrpVerification(
    providerId: string,
    userInfo: OAuthUserInfo,
    existingUser: User, // Prisma User
  ): Promise<{
    requiresVerification: true;
    verificationType: 'srp';
    email: string; // email of the existingUser
    sessionId: string; // session ID for this verification attempt
    salt: string;
    serverPublicEphemeral: string;
  }> {
    const sessionId = this.generateOAuthSessionId('srp', providerId, userInfo.id);
    if (!existingUser.srpVerifier || !existingUser.srpSalt) {
        throw new SrpNotUpgradedError(existingUser.username); // Should have been checked before calling
    }
    const serverSession = await this.srpService.createServerSession(existingUser.srpVerifier);
    const sessionData = {
      type: 'srp',
      providerId,
      userInfo,
      existingUserId: existingUser.id,
      serverEphemeral: serverSession.serverEphemeral, // Store the whole ephemeral for verification
    };
    await this.redis.setex(`oauth_session:${sessionId}`, 15 * 60, JSON.stringify(sessionData));
    if (!existingUser.email) {
        throw new Error("Existing user for OAuth SRP verification has no email.");
    }
    return {
      requiresVerification: true,
      verificationType: 'srp',
      email: existingUser.email,
      sessionId,
      salt: existingUser.srpSalt,
      serverPublicEphemeral: serverSession.serverEphemeral.public,
    };
  }

  private generateOAuthSessionId(
    type: 'password' | 'srp' | 'binding',
    providerId: string,
    identifier: string, // providerUserId or local userId for binding
  ): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `oauth_${type}_${providerId}_${identifier}_${timestamp}_${random}`;
  }

  private async generateOAuthStateToken(
    providerId: string,
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<string> {
    const tokenData = { providerId, userInfo, ip, userAgent, timestamp: Date.now() };
    return this.sharedAuthService.sign( // Use SharedAuthService
      {
        userId: 0, // Placeholder
        username: 'oauth_state_token',
        permissions: [{
          authorizedActions: ['oauth-decision'],
          authorizedResource: { ownedByUser: 0, types: ['oauth/state-token'], resourceIds: undefined, data: tokenData },
        }],
      },
      15 * 60, // 15 minutes
    );
  }

  // decodeOAuthStateToken - used by getOAuthStateInfo, which is called by controller before user makes decision
  // This is an auth-related utility.
  private async decodeOAuthStateToken(stateToken: string): Promise<{
    providerId: string;
    userInfo: OAuthUserInfo;
    ip: string;
    userAgent: string | undefined;
    timestamp: number;
  }> {
    try {
      await this.sharedAuthService.audit(stateToken, 'oauth-decision', 0, 'oauth/state-token');
      const decoded = this.sharedAuthService.decode(stateToken);
      const tokenData = decoded.authorization.permissions[0].authorizedResource.data;
      return tokenData as any; // Cast needed as data is generic
    } catch (error) {
      this.logger.error(`decodeOAuthStateToken failed: ${error}`);
      throw new Error('Invalid or expired OAuth state token'); // More specific error?
    }
  }

  // getOAuthStateInfo: Provides info for client to make decisions (create/link account).
  // This is part of the auth flow.
  async getOAuthStateInfo(stateToken: string): Promise<{
    providerId: string;
    userInfo: { id: string; email?: string; name?: string; username?: string; preferredUsername?: string };
    suggestedUsername: string;
    suggestedNickname: string;
    emailConflict: boolean; // If the email from OAuth is already in the system
  }> {
    const decoded = await this.decodeOAuthStateToken(stateToken);
    const { providerId, userInfo } = decoded;

    // Suggested username/nickname logic will be in AccountService
    const baseUsername = this.accountService.generateOAuthUsername(userInfo);
    const suggestedUsername = await this.accountService.generateUniqueUsername(baseUsername);

    let rawNickname = userInfo.name || userInfo.preferredUsername || suggestedUsername;
    const suggestedNickname = rawNickname
        .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 16);

    let emailConflict = false;
    if (userInfo.email) {
      emailConflict = await this.accountService.isEmailRegistered(userInfo.email);
    }

    return {
      providerId,
      userInfo: { id: userInfo.id, email: userInfo.email, name: userInfo.name, username: userInfo.username, preferredUsername: userInfo.preferredUsername },
      suggestedUsername,
      suggestedNickname,
      emailConflict,
    };
  }

  // createOAuthUserFromDecision: Called after user decides to create a new account with OAuth.
  // This involves account creation, so it should primarily be in AccountService.
  // AccountService would then call this AuthService to link the OAuth identity.
  // For now, this logic is complex and mixed. It will be a key area for careful splitting.
  // Let's assume AccountService.createOAuthUser(providerId, userInfo, chosenUsername, chosenNickname, ip, userAgent)
  // then calls AuthService.linkOAuthToUser(newUserId, providerId, userInfo).
  // This method as is, is too broad for the new AuthService.
  // It will be significantly refactored. The "create user" part goes to AccountService.
  // The "create OAuth connection" part can be a private method here, called by AccountService.


  // bindOAuthToExistingUser: User decides to link OAuth to an existing, authenticated account.
  // This is also a mix. User authenticates first (handled by this AuthService), then links.
  // Linking is a security/account setting.
  // This method will be split. The authentication part is here. The linking part in SecurityService.

  async completeOAuthVerification(
    sessionId: string,
    credentials: { password?: string; clientPublicEphemeral?: string; clientProof?: string },
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> { // OAuthUserDto might change
    const redis = this.redisService.getOrThrow();
    const sessionData = await redis.get(`oauth_session:${sessionId}`);
    if (!sessionData) throw new Error('OAuth session not found or expired');
    await redis.del(`oauth_session:${sessionId}`); // Consume session

    const session = JSON.parse(sessionData);
    let userToLink: User;
    let wasUpgradedDuringVerification = false;

    const targetUser = await this.prismaService.user.findUnique({where: {id: session.existingUserId }});
    if(!targetUser) throw new UserIdNotFoundError(session.existingUserId);

    if (session.type === 'password') {
      if (!credentials.password) throw new Error('Password is required for OAuth password verification');
      const authResult = await this.authenticateUserWithPassword(targetUser, targetUser.username, credentials.password, true);
      if (!authResult.verified) throw new PasswordNotMatchError(targetUser.username);
      wasUpgradedDuringVerification = authResult.wasUpgraded;
      userToLink = targetUser;
    } else if (session.type === 'srp') {
      if (!credentials.clientPublicEphemeral || !credentials.clientProof || !session.serverEphemeral || !targetUser.srpSalt || !targetUser.srpVerifier) {
        throw new Error('SRP credentials or session data missing for OAuth SRP verification');
      }
      const srpResult = await this.srpService.verifyClient(
        session.serverEphemeral.secret,
        credentials.clientPublicEphemeral,
        targetUser.srpSalt,
        targetUser.username,
        targetUser.srpVerifier,
        credentials.clientProof,
      );
      if (!srpResult.success) throw new SrpVerificationError();
      userToLink = targetUser;
    } else {
      throw new Error('Invalid OAuth session type');
    }

    // User verified, now create the OAuth connection
    await this.createOrUpdateOAuthConnection(userToLink.id, session.providerId, session.userInfo);

    await this.prismaService.userLoginLog.create({ data: { userId: userToLink.id, ip, userAgent } });

    // The controller will call AccountService to get the full OAuthUserDto for the response if needed.
    // This service returns minimal info + session.
    const minimalUser = {id: userToLink.id, username: userToLink.username, email: userToLink.email };
    const sessionToken = await this.createSession(userToLink.id);

    return [minimalUser as OAuthUserDto, sessionToken]; // Cast for now, or define a specific return type
  }

  // Renamed for clarity and to signify it's an internal auth operation
  public async linkOAuthAccount( // Was createOrUpdateOAuthConnection
    userId: number,
    providerId: string,
    userInfo: OAuthUserInfo,
  ): Promise<void> {
    const existingConnection = await this.prismaService.userOAuthConnection.findUnique({
      where: { providerId_providerUserId: { providerId, providerUserId: userInfo.id } },
    });

    if (existingConnection) {
      if (existingConnection.userId !== userId) {
        // This OAuth identity is already linked to a DIFFERENT user. This is an error.
        throw new Error(`OAuth identity ${providerId}:${userInfo.id} already linked to user ${existingConnection.userId}.`);
      }
      // Already linked to the same user, update rawProfile and timestamp
      await this.prismaService.userOAuthConnection.update({
        where: { id: existingConnection.id },
        data: { rawProfile: userInfo as any, updatedAt: new Date() },
      });
    } else {
      // New connection for this user
      await this.prismaService.userOAuthConnection.create({
        data: { userId, providerId, providerUserId: userInfo.id, rawProfile: userInfo as any },
      });
    }
  }

  // handleExistingOAuthConnection: Called when OAuth callback finds an existing connection.
  private async handleExistingOAuthConnection(
    existingConnection: any, // Prisma type with includes
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> { // OAuthUserDto might change
    const userId = existingConnection.userId;
    // User already linked, just log in.
    // Optionally update OAuth profile data.
    await this.prismaService.userOAuthConnection.update({
      where: { id: existingConnection.id },
      data: { rawProfile: userInfo as any, updatedAt: new Date() },
    });
    await this.prismaService.userLoginLog.create({ data: { userId, ip, userAgent } });

    const user = await this.prismaService.user.findUnique({ where: {id: userId}});
    if (!user) throw new UserIdNotFoundError(userId);
    // Return minimal user info for AuthController to then fetch full DTO if needed
    return [
      {id: user.id, username: user.username, email: user.email} as OAuthUserDto, // Cast for now
      await this.createSession(userId),
    ];
  }

  // createNewOAuthUser: This entire method should move to AccountService.
  // AccountService will call `createOrUpdateOAuthConnection` after creating the user.

  // generateOAuthUsername: Utility, move to account or shared utils.
  // generateUniqueUsername: Utility, move to account or shared utils.
  // generateRandomPassword: Utility, move to account or shared utils.
  // createDefaultProfileForUser: Utility for account creation, move to account service.

  // --- Methods for user-managed OAuth connections (Security Settings) ---
  // initOAuthBinding // Belongs to security service
  // handleOAuthBindingCallback // Belongs to security service
  // getUserOAuthConnections // Belongs to security service
  // unbindOAuth // Belongs to security service
}

// The temporary UsersService class definition at the end of this file is removed.
// Actual AccountService will be in its own file.

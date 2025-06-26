/*
 *  Description: This file implements the AccountService for user account management.
 *               It is responsible for the business logic of user registration,
 *               profile updates, password management, etc.
 */

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  User,
  UserProfile,
  UserRegisterLogType,
  UserResetPasswordLogType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import crypto from 'node:crypto';
import { RedisService } from '@liaoliaots/nestjs-redis'; // For cache invalidation if needed
import Redis from 'ioredis'; // For cache invalidation if needed

import { AuthService as SharedAuthService } from '../../auth/auth.service';
import { SessionService } from '../../auth/session.service';
import { AvatarNotFoundError } from '../../avatars/avatars.error';
import { AvatarsService } from '../../avatars/avatars.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailRuleService } from '../../email/email-rule.service';
import { EmailService } from '../../email/email.service';
import { UsersRegisterRequestService } from '../users-register-request.service';
import { SrpService } from '../srp.service';
import { AuthService as UserAuthService } from '../auth/auth.service'; // Correct import for the new AuthService

// DTOs
import { UserDto } from './dto/user.dto';
// import { OAuthUserDto } from './dto/oauth-user.dto'; // This DTO seems more related to auth/OAuth context.
// For now, AccountService will construct UserDto, and if an OAuthUserDto is needed by AuthController for OAuth completion,
// it can be constructed there or by the new AuthService based on UserDto + email.
// Let's assume OAuthUserDto is not directly constructed or returned by AccountService for now.
// If AuthController needs it, it will call AccountService.getUserDtoById and then enrich it with email.

// Errors
import {
  InvalidEmailAddressError,
  InvalidEmailSuffixError,
  EmailAlreadyRegisteredError,
  EmailSendFailedError,
  InvalidUsernameError,
  InvalidNicknameError,
  InvalidPasswordError,
  UsernameAlreadyRegisteredError,
  CodeNotMatchError,
  UserIdNotFoundError,
  UsernameNotFoundError,
  EmailNotFoundError,
  UpdateAvatarError,
} from './errors/account.error'; // Corrected path
import { PermissionDeniedError, TokenExpiredError, InvalidLoginCredentialsError } from '../../auth/auth.error'; // Shared auth errors
import { AnswerService } from '../../answer/answer.service';
import { QuestionsService } from '../../questions/questions.service';
// UserFollowingRelationship is a Prisma type, not typically imported directly unless used for specific return types not DTOs.
// import { PageDto } from '../../common/DTO/page-response.dto'; // If listing methods are part of AccountService
// import { PageHelper } from '../../common/helper/page.helper'; // If listing methods are part of AccountService

const USER_PROFILE_UPDATE_CHANNEL = 'cache:user:updated';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailRuleService: EmailRuleService,
    private readonly usersRegisterRequestService: UsersRegisterRequestService,
    private readonly avatarsService: AvatarsService,
    private readonly sharedAuthService: SharedAuthService,
    private readonly srpService: SrpService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
    // Removed: sessionService (direct session creation for auto-login is an anti-pattern for AccountService)
    // Auto-login after registration should be handled by the calling controller making a subsequent call to AuthService if desired.
    @Inject(forwardRef(() => UserAuthService)) // Correctly typed dependency on the new AuthService
    private readonly userAuthService: UserAuthService,
    // The new AuthService from users/auth
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  private readonly passwordResetEmailValidSeconds = 10 * 60; // 10 minutes

  private generateVerifyCode(): string {
    let code: string = '';
    for (let i = 0; i < 6; i++) {
      code += crypto.randomInt(10).toString();
    }
    return code;
  }

  get emailSuffixRule(): string {
    return this.emailRuleService.emailSuffixRule;
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    return ( (await this.prismaService.user.count({ where: { email } })) > 0 );
  }

  async findUserRecordOrThrow(userId: number): Promise<User> {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (user) return user;
    throw new UserIdNotFoundError(userId);
  }

  async findUserRecordByUsernameOrThrow(username: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({ where: { username } });
    if (user) return user;
    throw new UsernameNotFoundError(username);
  }

  async findUserRecordAndProfileRecordOrThrow(userId: number): Promise<[User, UserProfile]> {
    const user = await this.findUserRecordOrThrow(userId);
    const profile = await this.prismaService.userProfile.findUnique({ where: { userId: userId } });
    if (!profile) {
      this.logger.error(`User '${user.username}' (ID: ${userId}) does not have a profile! Creating one.`);
      // Potentially create a default profile here if business logic allows
      // For now, let's assume this is an inconsistent state that should be fixed or handled.
      // Depending on strictness, could throw an error or create a default.
      // Let's create a default one to be resilient, but log a warning.
      return [user, await this.createDefaultProfileForUser(user.id, user.username)];
    }
    return [user, profile];
  }

  private async createDefaultProfileForUser(userId: number, username: string): Promise<UserProfile> {
    const avatarId = await this.avatarsService.getDefaultAvatarId();
    return this.prismaService.userProfile.create({
      data: {
        userId,
        nickname: username, // Default nickname to username
        intro: this.defaultIntro,
        avatarId,
      },
    });
  }


  async isUsernameRegistered(username: string): Promise<boolean> {
    return ( (await this.prismaService.user.count({ where: { username } })) > 0 );
  }

  private async createUserRegisterLog( type: UserRegisterLogType, email: string, ip: string, userAgent: string | undefined): Promise<void> {
    await this.prismaService.userRegisterLog.create({
      data: { type, email, ip, userAgent },
    });
  }

  private async createPasswordResetLog(type: UserResetPasswordLogType, userId: number | undefined, ip: string, userAgent: string | undefined): Promise<void> {
    await this.prismaService.userResetPasswordLog.create({
      data: { type, userId, ip, userAgent },
    });
  }

  async sendRegisterEmailCode(email: string, ip: string, userAgent: string | undefined): Promise<void> {
    if (!isEmail(email)) {
      await this.createUserRegisterLog(UserRegisterLogType.RequestFailDueToInvalidOrNotSupportedEmail, email, ip, userAgent);
      throw new InvalidEmailAddressError(email);
    }
    if (!(await this.emailRuleService.isEmailSuffixSupported(email))) {
      await this.createUserRegisterLog(UserRegisterLogType.RequestFailDueToInvalidOrNotSupportedEmail, email, ip, userAgent);
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }
    if (await this.isEmailRegistered(email)) {
      await this.createUserRegisterLog(UserRegisterLogType.RequestFailDueToAlreadyRegistered, email, ip, userAgent);
      throw new EmailAlreadyRegisteredError(email);
    }

    const code = this.generateVerifyCode();
    try {
      await this.emailService.sendRegisterCode(email, code);
    } catch (e) {
      await this.createUserRegisterLog(UserRegisterLogType.RequestFailDueToSendEmailFailure, email, ip, userAgent);
      throw new EmailSendFailedError(email);
    }
    await this.usersRegisterRequestService.createRequest(email, code);
    await this.createUserRegisterLog(UserRegisterLogType.RequestSuccess, email, ip, userAgent);
  }

  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_-]{4,32}$/.test(username);
  }

  get usernameRule(): string {
    return 'Username must be 4-32 characters long and can only contain letters, numbers, underscores and hyphens.';
  }

  private isValidNickname(nickname: string): boolean {
    return /^[a-zA-Z0-9_\u4e00-\u9fa5]{1,16}$/.test(nickname);
  }

  get nicknameRule(): string {
    return 'Nickname must be 1-16 characters long and can only contain letters, numbers, underscores, hyphens and Chinese characters.';
  }

  private isValidPassword(password: string): boolean {
    return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\x00-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]).{8,}$/.test(password);
  }

  get passwordRule(): string {
    return 'Password must be at least 8 characters long and must contain at least one letter, one special character and one number.';
  }

  get defaultIntro(): string {
    return 'This user has not set an introduction yet.';
  }

  async register(
    username: string, nickname: string, srpSalt: string | undefined, srpVerifier: string | undefined,
    email: string, emailCode: string, ip: string, userAgent: string | undefined,
    password?: string, isLegacyAuth?: boolean,
  ): Promise<UserDto> { // Returns UserDto which includes counts, implies complex creation or separate DTO
    if (!this.isValidUsername(username)) throw new InvalidUsernameError(username, this.usernameRule);
    if (!this.isValidNickname(nickname)) throw new InvalidNicknameError(nickname, this.nicknameRule);
    if (!isEmail(email)) throw new InvalidEmailAddressError(email);
    if (!(await this.emailRuleService.isEmailSuffixSupported(email))) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    if (isLegacyAuth) {
      if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
        throw new Error('Legacy authentication is only allowed in test/development environment');
      }
      if (!password) throw new Error('Password is required for legacy authentication');
      if (!this.isValidPassword(password)) throw new InvalidPasswordError(this.passwordRule);
    } else {
      if (!srpSalt || !srpVerifier) throw new Error('SRP credentials are required for registration');
    }

    const disableEmailVerification = this.configService.get<boolean>('disableEmailVerification');
    if (disableEmailVerification || (await this.usersRegisterRequestService.verifyRequest(email, emailCode))) {
      if (await this.isEmailRegistered(email)) {
        // This case should ideally be caught before verifyRequest if possible, but a race condition could occur.
        throw new EmailAlreadyRegisteredError(email);
      }
      if (await this.isUsernameRegistered(username)) {
        await this.createUserRegisterLog(UserRegisterLogType.FailDueToUserExistence, email, ip, userAgent);
        throw new UsernameAlreadyRegisteredError(username);
      }

      const avatarId = await this.avatarsService.getDefaultAvatarId();
      let hashedPassword = '';
      let finalSrpSalt = srpSalt;
      let finalSrpVerifier = srpVerifier;
      let isSrpUpgraded = !!(!isLegacyAuth && srpSalt && srpVerifier);


      if (isLegacyAuth && password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
        finalSrpSalt = ''; // No SRP for legacy
        finalSrpVerifier = ''; // No SRP for legacy
        isSrpUpgraded = false;
      }

      const newUser = await this.prismaService.user.create({
        data: {
          username, email, hashedPassword,
          srpSalt: finalSrpSalt, srpVerifier: finalSrpVerifier, srpUpgraded: isSrpUpgraded,
          userProfile: { create: { nickname, intro: this.defaultIntro, avatarId } },
        },
        include: { userProfile: true } // Ensure profile is included for DTO construction
      });
      await this.createUserRegisterLog(UserRegisterLogType.Success, email, ip, userAgent);

      // Construct UserDto. This is simplified. Full DTO needs counts.
      if (!newUser.userProfile) throw new Error("User profile not created during registration"); // Should not happen
      return {
        id: newUser.id, username: newUser.username, nickname: newUser.userProfile.nickname,
        avatarId: newUser.userProfile.avatarId, intro: newUser.userProfile.intro,
        follow_count: 0, fans_count: 0, question_count: 0, answer_count: 0, is_follow: false,
      };
    } else {
      await this.createUserRegisterLog(UserRegisterLogType.FailDueToWrongCodeOrExpired, email, ip, userAgent);
      throw new CodeNotMatchError(email, emailCode);
    }
  }

  async getUserDtoById(userId: number, viewerId: number | undefined, ip: string, userAgent: string | undefined): Promise<UserDto> {
    const [userDto] = await this.getUsersDtoByIds([userId], viewerId, ip, userAgent);
    return userDto;
  }

  async getUsersDtoByIds(userIds: number[], viewerId: number | undefined, ip: string, userAgent: string | undefined): Promise<UserDto[]> {
    if (userIds.length === 0) return [];
    const uniqueUserIds = [...new Set(userIds)];

    const usersWithProfiles = await this.prismaService.user.findMany({
      where: { id: { in: uniqueUserIds } },
      include: { userProfile: true },
    });
    const userMap = new Map(usersWithProfiles.map((u) => [u.id, u]));

    const followCounts = await this.prismaService.userFollowingRelationship.groupBy({
      by: ['followerId'], where: { followerId: { in: uniqueUserIds } }, _count: { followerId: true },
    });
    const followCountMap = new Map(followCounts.map((fc) => [fc.followerId, fc._count.followerId]));

    const fanCounts = await this.prismaService.userFollowingRelationship.groupBy({
      by: ['followeeId'], where: { followeeId: { in: uniqueUserIds } }, _count: { followeeId: true },
    });
    const fanCountMap = new Map(fanCounts.map((fc) => [fc.followeeId, fc._count.followeeId]));

    let followedUserIds = new Set<number>();
    if (viewerId) {
      const followedByViewer = await this.prismaService.userFollowingRelationship.findMany({
        where: { followerId: viewerId, followeeId: { in: uniqueUserIds } }, select: { followeeId: true },
      });
      followedUserIds = new Set(followedByViewer.map((r) => r.followeeId));
    }

    const answerCounts = await this.prismaService.answer.groupBy({
      by: ['createdById'], where: { createdById: { in: uniqueUserIds }, deletedAt: null }, _count: { createdById: true },
    });
    const answerCountMap = new Map(answerCounts.map((ac) => [ac.createdById, ac._count.createdById]));

    const questionCounts = await this.prismaService.question.groupBy({
      by: ['createdById'], where: { createdById: { in: uniqueUserIds }, deletedAt: null }, _count: { createdById: true },
    });
    const questionCountMap = new Map(questionCounts.map((qc) => [qc.createdById, qc._count.createdById]));

    const userDtos: UserDto[] = [];
    for (const userId of userIds) { // Iterate over original userIds to maintain order and count
      const user = userMap.get(userId);
      if (!user || !user.userProfile) throw new UserIdNotFoundError(userId);
      userDtos.push({
        id: user.id, username: user.username, nickname: user.userProfile.nickname,
        avatarId: user.userProfile.avatarId, intro: user.userProfile.intro,
        follow_count: followCountMap.get(userId) || 0,
        fans_count: fanCountMap.get(userId) || 0,
        is_follow: viewerId ? followedUserIds.has(userId) : false,
        question_count: questionCountMap.get(userId) || 0,
        answer_count: answerCountMap.get(userId) || 0,
      });
    }

    if (uniqueUserIds.length > 0) { // Log only for unique existing users
        await this.prismaService.userProfileQueryLog.createMany({
            data: uniqueUserIds.map((userId) => ({ viewerId, vieweeId: userId, ip, userAgent })),
        });
    }
    return userDtos;
  }

  // This method is primarily for auth context. If AccountService needs to provide user data for OAuth,
  // it should return a UserDto or a specific Account-related DTO.
  // The Auth Service or Controller can then combine this with OAuth specific info.
  // Removing this from AccountService to simplify its scope. Auth service will handle OAuth DTOs.
  // async getOAuthUserDtoById(...)

  async sendResetPasswordEmail(email: string, ip: string, userAgent: string | undefined): Promise<void> {
    if (!isEmail(email)) throw new InvalidEmailAddressError(email);
    if (!(await this.emailRuleService.isEmailSuffixSupported(email))) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (user) {
      const token = this.sharedAuthService.sign(
        { userId: user.id, username: user.username, permissions: [{ authorizedActions: ['modify'], authorizedResource: { ownedByUser: user.id, types: ['users/password:reset'], data: Date.now() } }] },
        this.passwordResetEmailValidSeconds,
      );
      try {
        await this.emailService.sendPasswordResetEmail(email, user.username, token);
        await this.createPasswordResetLog(UserResetPasswordLogType.RequestSuccess, user.id, ip, userAgent);
      } catch(e) {
        await this.createPasswordResetLog(UserResetPasswordLogType.RequestFailDueToSecurity, user.id, ip, userAgent);
        throw new EmailSendFailedError(email);
      }
    } else {
      await this.createPasswordResetLog(UserResetPasswordLogType.RequestFailDueToNoneExistentEmail, undefined, ip, userAgent);
    }
  }

  async verifyAndResetPassword(token: string, srpSalt: string, srpVerifier: string, ip: string, userAgent: string | undefined): Promise<void> {
    const decodedToken = this.sharedAuthService.decode(token); // decode first to get userId for logging, even if invalid
    const userId = decodedToken.authorization.userId;
    try {
      await this.sharedAuthService.audit(token, 'modify', userId, 'users/password:reset');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        await this.createPasswordResetLog(UserResetPasswordLogType.FailDueToInvalidToken, userId, ip, userAgent);
      } else if (e instanceof TokenExpiredError) {
        await this.createPasswordResetLog(UserResetPasswordLogType.FailDueToExpiredRequest, userId, ip, userAgent);
      }
      throw e; // Re-throw after logging
    }

    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) {
      await this.createPasswordResetLog(UserResetPasswordLogType.FailDueToNoUser, userId, ip, userAgent);
      throw new Error('User not found after valid password reset token.'); // Should be rare
    }
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedPassword: '', srpSalt, srpVerifier, srpUpgraded: true, lastPasswordChangedAt: new Date() },
    });
    await this.createPasswordResetLog(UserResetPasswordLogType.Success, userId, ip, userAgent);
  }

  async updateUserProfile(userId: number, nickname: string, intro: string, avatarId: number): Promise<void> {
    this.logger.log(`Attempting to update profile for user ID: ${userId}`);
    const [, profile] = await this.findUserRecordAndProfileRecordOrThrow(userId);
    if (!(await this.avatarsService.isAvatarExists(avatarId))) {
      throw new AvatarNotFoundError(avatarId);
    }
    const oldAvatarId = profile.avatarId;
    if (profile.nickname !== nickname || profile.intro !== intro || profile.avatarId !== avatarId) {
      await this.prismaService.userProfile.update({
        where: { userId }, data: { nickname, intro, avatarId },
      });
      this.logger.log(`Profile successfully updated for user ID: ${userId}`);
      try {
        await this.redis.publish(USER_PROFILE_UPDATE_CHANNEL, userId.toString());
      } catch (error) {
        this.logger.error(`Failed to publish cache invalidation for user ${userId}`, error);
      }
      if (oldAvatarId !== avatarId) {
        try {
          await Promise.all([
            this.avatarsService.plusUsageCount(avatarId),
            this.avatarsService.minusUsageCount(oldAvatarId),
          ]);
        } catch (avatarError) {
          this.logger.error(`Error updating avatar usage counts for user ${userId}`, avatarError);
        }
      }
    }
  }

  async changePassword(userId: number, srpSalt: string, srpVerifier: string): Promise<void> {
    await this.findUserRecordOrThrow(userId); // Ensure user exists
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        hashedPassword: '', // Clear legacy password hash
        srpSalt,
        srpVerifier,
        srpUpgraded: true,
        lastPasswordChangedAt: new Date(),
      },
    });
  }

  // --- Methods related to OAuth user creation/linking post-decision ---
  // These are called by AuthController after OAuth flow and user decision
  // They involve account creation/modification.

  async createOAuthUserFromDecision(
    stateToken: string, username: string, nickname: string,
    ip: string, userAgent: string | undefined
  ): Promise<[OAuthUserDto, string]> { // Returns DTO and RefreshToken
    // Decode stateToken: This should be done by the calling service (e.g., UserAuthService) before passing userInfo.
    // AccountService should receive providerId and userInfo directly if they are needed for account creation.
    // For now, assuming UserAuthService calls this with necessary data.
    // Let's refine the signature if UserAuthService is directly passed or if this method is called by AuthController.
    // This method is called by AuthController, which gets stateToken. AuthController should decode it using UserAuthService
    // and then pass the necessary `providerId` and `userInfo` to this AccountService method.
    // So, the signature should be:
    // async createOAuthUserFromDecision(
    //   providerId: string, userInfo: OAuthUserInfo, // These would come from decoded stateToken
    //   username: string, nickname: string,
    //   ip: string, userAgent: string | undefined
    // ): Promise<[UserDto, string]> { // Returns DTO and *Session* Token (not refresh)

    // For now, to make minimal changes to controller, keeping stateToken and calling userAuthService.decodeOAuthStateToken
    const decodedState = await this.userAuthService.decodeOAuthStateToken(stateToken);
    const { providerId, userInfo } = decodedState;

    if (!this.isValidUsername(username)) throw new InvalidUsernameError(username, this.usernameRule);
    if (!this.isValidNickname(nickname)) throw new InvalidNicknameError(nickname, this.nicknameRule);
    if (await this.isUsernameRegistered(username)) throw new UsernameAlreadyRegisteredError(username);
    if (userInfo.email && (await this.isEmailRegistered(userInfo.email))) {
      throw new EmailAlreadyRegisteredError(userInfo.email);
    }

    const avatarId = await this.avatarsService.getDefaultAvatarId();
    const randomPassword = crypto.randomBytes(16).toString('hex'); // Placeholder password
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    let userEmail = userInfo.email || `oauth-${providerId}-${userInfo.id}@placeholder.internal`;

    const newUser = await this.prismaService.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username, email: userEmail, hashedPassword, srpUpgraded: false, // OAuth users are not SRP upgraded by default
          userProfile: { create: { nickname, intro: this.defaultIntro, avatarId } },
        },
        include: {userProfile: true}
      });
      await tx.userOAuthConnection.create({
        data: { userId: createdUser.id, providerId, providerUserId: userInfo.id, rawProfile: userInfo as any },
      });
      await tx.userRegisterLog.create({ data: { type: 'Success', email: userEmail, ip, userAgent } });
      await tx.userLoginLog.create({ data: { userId: createdUser.id, ip, userAgent } });
      return createdUser;
    });

    const userDto = await this.getUserDtoById(newUser.id, newUser.id, ip, userAgent); // Use UserDto
    const sessionToken = await this.userAuthService.createSession(newUser.id);
    // AccountService should ideally not be responsible for generating refresh tokens directly for other modules' flows.
    // The controller (AuthController) should handle the session refresh if needed after this step.
    // Let's return the direct sessionToken. The controller can decide to refresh it.
    return [userDto, sessionToken];
  }

  async bindOAuthToExistingUser(
    stateToken: string, usernameForLookup: string, // Renamed for clarity
    credentials: { password?: string; clientPublicEphemeral?: string; clientProof?: string },
    ip: string, userAgent: string | undefined
  ): Promise<[UserDto, string]> { // Returns UserDto and Session Token
    const decodedState = await this.userAuthService.decodeOAuthStateToken(stateToken);
    const { providerId, userInfo } = decodedState;

    const user = await this.findUserRecordByUsernameOrThrow(usernameForLookup);

    // Authenticate user - this part should ideally call the new AuthService.login or a specific verify method
    let verified = false;
    if (user.srpUpgraded && user.srpSalt && user.srpVerifier) {
        if (!credentials.clientPublicEphemeral || !credentials.clientProof) throw new Error("SRP credentials required");
        // This needs a serverSecretEphemeral from an SRP init step, which is not part of this flow.
        // This indicates a flow design issue for binding SRP user via this path.
        // For now, let's assume this path is for password users or the SRP handling is simplified/different.
        // A proper SRP bind would require an SRP init exchange first.
        // Let's throw, as this specific flow isn't well-supported for SRP without prior init.
        throw new Error("SRP user binding via this OAuth decision path requires prior SRP handshake for verification.");
    } else if (user.hashedPassword) {
        if (!credentials.password) throw new Error("Password required");
        verified = await bcrypt.compare(credentials.password, user.hashedPassword);
    }
    if (!verified) throw new InvalidLoginCredentialsError();

    // createOrUpdateOAuthConnection should be a method in UserAuthService or a shared OAuthConnectionService
    // For now, assuming UserAuthService has a method to handle this.
    await this.userAuthService.createOrUpdateOAuthConnection(user.id, providerId, userInfo);

    await this.prismaService.userLoginLog.create({ data: { userId: user.id, ip, userAgent } });
    const userDto = await this.getUserDtoById(user.id, user.id, ip, userAgent);
    const sessionToken = await this.userAuthService.createSession(user.id);

    return [userDto, sessionToken];
  }
}

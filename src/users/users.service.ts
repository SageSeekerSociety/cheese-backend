/*
 *  Description: This file implements the UsersService class.
 *               It is responsible for the business logic of users.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { RedisService } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Passkey,
  User,
  UserFollowingRelationship,
  UserProfile,
  UserRegisterLogType,
  UserResetPasswordLogType,
} from '@prisma/client';
import {
  AuthenticationResponseJSON,
  CredentialDeviceType,
  RegistrationResponseJSON,
  WebAuthnCredential,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { Request } from 'express';
import Redis from 'ioredis';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { AnswerService } from '../answer/answer.service';
import {
  InvalidCredentialsError,
  PermissionDeniedError,
  TokenExpiredError,
} from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { Authorization } from '../auth/definitions';
import { OAuthUserInfo } from '../auth/oauth/oauth.types';
import { SessionService } from '../auth/session.service';
import { AvatarNotFoundError } from '../avatars/avatars.error';
import { AvatarsService } from '../avatars/avatars.service';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailRuleService } from '../email/email-rule.service';
import { EmailService } from '../email/email.service';
import { QuestionsService } from '../questions/questions.service';
import { OAuthUserDto } from './DTO/oauth.dto';
import { UserDto } from './DTO/user.dto';
import { SrpService } from './srp.service';
import { TOTPService } from './totp.service';
import { UserChallengeRepository } from './user-challenge.repository';
import { UsersPermissionService } from './users-permission.service';
import { UsersRegisterRequestService } from './users-register-request.service';
import {
  ChallengeNotFoundError,
  CodeNotMatchError,
  EmailAlreadyRegisteredError,
  EmailNotFoundError,
  EmailSendFailedError,
  FollowYourselfError,
  InvalidEmailAddressError,
  InvalidEmailSuffixError,
  InvalidNicknameError,
  InvalidPasswordError,
  InvalidUsernameError,
  PasskeyNotFoundError,
  PasskeyVerificationFailedError,
  PasswordNotMatchError,
  SrpNotUpgradedError,
  SrpVerificationError,
  TOTPInvalidError,
  TOTPRequiredError,
  TOTPTempTokenInvalidError,
  UserAlreadyFollowedError,
  UserIdNotFoundError,
  UserNotFollowedYetError,
  UsernameAlreadyRegisteredError,
  UsernameNotFoundError,
} from './users.error';

const USER_PROFILE_UPDATE_CHANNEL = 'cache:user:updated';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly emailRuleService: EmailRuleService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userChallengeRepository: UserChallengeRepository,
    private readonly usersPermissionService: UsersPermissionService,
    private readonly usersRegisterRequestService: UsersRegisterRequestService,
    private readonly avatarsService: AvatarsService,
    @Inject(forwardRef(() => AnswerService))
    private readonly answerService: AnswerService,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
    private readonly prismaService: PrismaService,
    private readonly totpService: TOTPService,
    private readonly srpService: SrpService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  private readonly passwordResetEmailValidSeconds = 10 * 60; // 10 minutes

  private get rpName(): string {
    return this.configService.get('webauthn.rpName') ?? 'Cheese Community';
  }

  private get rpID(): string {
    return this.configService.get('webauthn.rpID') ?? 'localhost';
  }

  private get origin(): string {
    return this.configService.get('webauthn.origin') ?? 'http://localhost:7777';
  }

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

  async generatePasskeyRegistrationOptions(
    userId: number,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const [user, _] = await this.findUserRecordAndProfileRecordOrThrow(userId);

    const existingPasskeys = await this.prismaService.passkey.findMany({
      where: {
        userId,
      },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.username,
      userID: Buffer.from(user.id.toString()),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports
          ? JSON.parse(passkey.transports)
          : undefined,
      })),
      timeout: 60000,
    });

    await this.userChallengeRepository.setChallenge(
      userId,
      options.challenge,
      600,
    );

    return options;
  }

  async verifyPasskeyRegistration(
    userId: number,
    response: RegistrationResponseJSON,
  ): Promise<void> {
    const challenge = await this.userChallengeRepository.getChallenge(userId);

    if (challenge == null) {
      throw new ChallengeNotFoundError();
    }

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: false,
    });

    if (!verified || registrationInfo == null) {
      throw new PasskeyVerificationFailedError();
    }

    const { credential, credentialBackedUp, credentialDeviceType } =
      registrationInfo;

    await this.savePasskeyCredential(
      userId,
      credential,
      credentialDeviceType,
      credentialBackedUp,
    );

    await this.userChallengeRepository.deleteChallenge(userId);
  }

  async savePasskeyCredential(
    userId: number,
    credential: WebAuthnCredential,
    deviceType: CredentialDeviceType,
    backedUp: boolean,
  ): Promise<void> {
    await this.prismaService.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        deviceType,
        backedUp,
        transports: credential.transports
          ? JSON.stringify(credential.transports)
          : null,
      },
    });
  }

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
      where: {
        userId,
      },
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
      where: {
        credentialId: response.id,
      },
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
      return false;
    }

    await this.prismaService.passkey.update({
      where: {
        id: authenticator.id,
      },
      data: {
        counter: authenticationInfo.newCounter,
      },
    });

    return true;
  }

  async handlePasskeyLogin(
    userId: number,
    ip: string,
    userAgent: string | undefined,
  ) {
    await this.prismaService.userLoginLog.create({
      data: {
        userId: userId,
        ip,
        userAgent,
      },
    });
    return [
      await this.getUserDtoById(userId, userId, ip, userAgent),
      await this.createSession(userId),
    ];
  }

  async getUserPasskeys(userId: number): Promise<Passkey[]> {
    return await this.prismaService.passkey.findMany({
      where: {
        userId,
      },
    });
  }

  async deletePasskey(userId: number, credentialId: string): Promise<void> {
    await this.prismaService.passkey.deleteMany({
      where: {
        userId,
        credentialId,
      },
    });
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    return (
      (await this.prismaService.user.count({
        where: {
          email,
        },
      })) > 0
    );
  }

  async findUserRecordOrThrow(userId: number): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (user != undefined) {
      return user;
    } else {
      throw new UserIdNotFoundError(userId);
    }
  }

  async findUserRecordByUsernameOrThrow(username: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: {
        username,
      },
    });
    if (user != undefined) {
      return user;
    } else {
      throw new UsernameNotFoundError(username);
    }
  }

  async findUserRecordAndProfileRecordOrThrow(
    userId: number,
  ): Promise<[User, UserProfile]> {
    const userPromise = this.findUserRecordOrThrow(userId);
    const profilePromise = this.prismaService.userProfile.findUnique({
      where: {
        userId: userId,
      },
    });
    const [user, profile] = await Promise.all([userPromise, profilePromise]);
    /* istanbul ignore if */
    // Above is a hint for istanbul to ignore the following line.
    if (profile == undefined) {
      throw new Error(`User '${user.username}' DO NOT has a profile!`);
    }
    return [user, profile];
  }

  async isUsernameRegistered(username: string): Promise<boolean> {
    return (
      (await this.prismaService.user.count({
        where: {
          username,
        },
      })) > 0
    );
  }

  private async createUserRegisterLog(
    type: UserRegisterLogType,
    email: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<void> {
    await this.prismaService.userRegisterLog.create({
      data: {
        type,
        email,
        ip,
        userAgent,
      },
    });
  }

  private async createPasswordResetLog(
    type: UserResetPasswordLogType,
    userId: number | undefined,
    ip: string,
    userAgent: string | undefined,
  ): Promise<void> {
    await this.prismaService.userResetPasswordLog.create({
      data: {
        type,
        userId,
        ip,
        userAgent,
      },
    });
  }

  async sendRegisterEmailCode(
    email: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<void> {
    if (isEmail(email) == false) {
      await this.createUserRegisterLog(
        UserRegisterLogType.RequestFailDueToInvalidOrNotSupportedEmail,
        email,
        ip,
        userAgent,
      );
      throw new InvalidEmailAddressError(email);
    }
    if ((await this.emailRuleService.isEmailSuffixSupported(email)) == false) {
      await this.createUserRegisterLog(
        UserRegisterLogType.RequestFailDueToInvalidOrNotSupportedEmail,
        email,
        ip,
        userAgent,
      );
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    // TODO: Add logic to determain whether code is sent too frequently.

    // Determine whether the email is registered.
    if (await this.isEmailRegistered(email)) {
      await this.createUserRegisterLog(
        UserRegisterLogType.RequestFailDueToAlreadyRegistered,
        email,
        ip,
        userAgent,
      );
      throw new EmailAlreadyRegisteredError(email);
    }

    // Now, email is valid, supported and not registered.
    // We can send the verify code.
    const code = this.generateVerifyCode();
    try {
      await this.emailService.sendRegisterCode(email, code);
    } catch (e) {
      await this.createUserRegisterLog(
        UserRegisterLogType.RequestFailDueToSendEmailFailure,
        email,
        ip,
        userAgent,
      );
      throw new EmailSendFailedError(email);
    }
    await this.usersRegisterRequestService.createRequest(email, code);
    await this.createUserRegisterLog(
      UserRegisterLogType.RequestSuccess,
      email,
      ip,
      userAgent,
    );
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
    // Password should contains at least one letter, one special character and one number.
    // It should contain at least 8 chars.
    // ? should \x00 be used in password?
    // todo: we should only use visible special characters
    // eslint-disable-next-line no-control-regex
    return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\x00-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]).{8,}$/.test(
      password,
    );
  }

  get passwordRule(): string {
    return 'Password must be at least 8 characters long and must contain at least one letter, one special character and one number.';
  }

  get defaultIntro(): string {
    return 'This user has not set an introduction yet.';
  }

  async register(
    username: string,
    nickname: string,
    srpSalt: string | undefined,
    srpVerifier: string | undefined,
    email: string,
    emailCode: string,
    ip: string,
    userAgent: string | undefined,
    password?: string,
    isLegacyAuth?: boolean,
  ): Promise<UserDto> {
    // 验证基本参数
    if (this.isValidUsername(username) == false) {
      throw new InvalidUsernameError(username, this.usernameRule);
    }
    if (this.isValidNickname(nickname) == false) {
      throw new InvalidNicknameError(nickname, this.nicknameRule);
    }
    if (isEmail(email) == false) {
      throw new InvalidEmailAddressError(email);
    }
    if ((await this.emailRuleService.isEmailSuffixSupported(email)) == false) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    // 验证是否允许使用传统认证方式
    if (isLegacyAuth) {
      if (
        process.env.NODE_ENV !== 'test' &&
        process.env.NODE_ENV !== 'development'
      ) {
        throw new Error(
          'Legacy authentication is only allowed in test/development environment',
        );
      }
      if (!password) {
        throw new Error('Password is required for legacy authentication');
      }
      if (!this.isValidPassword(password)) {
        throw new InvalidPasswordError(this.passwordRule);
      }
    } else {
      if (!srpSalt || !srpVerifier) {
        throw new Error('SRP credentials are required for registration');
      }
    }

    const disableEmailVerification = this.configService.get<boolean>(
      'disableEmailVerification',
    );

    if (
      disableEmailVerification ||
      (await this.usersRegisterRequestService.verifyRequest(email, emailCode))
    ) {
      if (await this.isEmailRegistered(email)) {
        throw new Error(
          `In a register attempt, the email is verified, but the email is already registered!` +
            `There are 4 possible reasons:\n` +
            `1. The user send two register email and verified them after that.\n` +
            `2. There is a bug in the code.\n` +
            `3. The database is corrupted.\n` +
            `4. We are under attack!`,
        );
      }
      if (await this.isUsernameRegistered(username)) {
        await this.createUserRegisterLog(
          UserRegisterLogType.FailDueToUserExistence,
          email,
          ip,
          userAgent,
        );
        throw new UsernameAlreadyRegisteredError(username);
      }

      const avatarId = await this.avatarsService.getDefaultAvatarId();
      const profile = {
        nickname,
        intro: this.defaultIntro,
        avatarId,
      };

      let hashedPassword = '';
      let finalSrpSalt = srpSalt;
      let finalSrpVerifier = srpVerifier;
      let isSrpUpgraded = true;

      // 如果是传统认证方式，生成密码哈希
      if (isLegacyAuth && password) {
        const salt = bcrypt.genSaltSync(10);
        hashedPassword = bcrypt.hashSync(password, salt);
        finalSrpSalt = '';
        finalSrpVerifier = '';
        isSrpUpgraded = false;
      }

      const result = await this.prismaService.user.create({
        data: {
          username,
          email,
          hashedPassword,
          srpSalt: finalSrpSalt,
          srpVerifier: finalSrpVerifier,
          srpUpgraded: isSrpUpgraded,
          userProfile: {
            create: profile,
          },
        },
      });

      await this.createUserRegisterLog(
        UserRegisterLogType.Success,
        email,
        ip,
        userAgent,
      );

      return {
        id: result.id,
        username: result.username,
        nickname: profile.nickname,
        avatarId: profile.avatarId,
        intro: profile.intro,
        follow_count: 0,
        fans_count: 0,
        question_count: 0,
        answer_count: 0,
        is_follow: false,
      };
    } else {
      await this.createUserRegisterLog(
        UserRegisterLogType.FailDueToWrongCodeOrExpired,
        email,
        ip,
        userAgent,
      );
      throw new CodeNotMatchError(email, emailCode);
    }
  }

  async getUserDtoById(
    userId: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<UserDto> {
    const [user, profile] =
      await this.findUserRecordAndProfileRecordOrThrow(userId);
    const vieweeId = user.id;
    await this.prismaService.userProfileQueryLog.create({
      data: {
        viewerId,
        vieweeId,
        ip,
        userAgent,
      },
    });
    const followCountPromise = this.getFollowingCount(userId);
    const fansCountPromise = this.getFollowedCount(userId);
    const ifFollowPromise = this.isUserFollowUser(viewerId, userId);
    const answerCountPromise = this.answerService.getAnswerCount(userId);
    const questionCountPromise = this.questionsService.getQuestionCount(userId);
    const [followCount, fansCount, isFollow, answerCount, questionCount] =
      await Promise.all([
        followCountPromise,
        fansCountPromise,
        ifFollowPromise,
        answerCountPromise,
        questionCountPromise,
      ]);
    return {
      id: user.id,
      username: user.username,
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      intro: profile.intro,
      follow_count: followCount,
      fans_count: fansCount,
      is_follow: isFollow,
      question_count: questionCount,
      answer_count: answerCount,
    };
  }

  /**
   * Get OAuth user DTO with email field for OAuth operations
   */
  async getOAuthUserDtoById(
    userId: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<OAuthUserDto> {
    const userDto = await this.getUserDtoById(userId, viewerId, ip, userAgent);
    const user = await this.findUserRecordOrThrow(userId);

    // 检查是否是占位符email，如果是则返回null
    const email =
      user.email && user.email.endsWith('@placeholder.internal')
        ? null
        : user.email;

    return {
      ...userDto,
      email: email,
    };
  }

  /**
   * 公共的用户认证逻辑，支持传统密码和自动SRP升级
   */
  private async authenticateUserWithPassword(
    user: any,
    username: string,
    password: string,
    autoUpgradeToSrp: boolean = true,
  ): Promise<{ verified: boolean; wasUpgraded: boolean }> {
    // 验证密码
    if (!bcrypt.compareSync(password, user.hashedPassword!)) {
      return { verified: false, wasUpgraded: false };
    }

    let wasUpgraded = false;
    // 如果用户还没升级到 SRP 且允许自动升级，则自动升级
    if (!user.srpUpgraded && autoUpgradeToSrp) {
      await this.srpService.upgradeUserToSrp(user.id, username, password);
      wasUpgraded = true;
    }

    return { verified: true, wasUpgraded };
  }

  /**
   * 检查用户是否需要特殊的认证流程
   */
  private determineOAuthAuthStrategy(
    user: any,
  ): 'srp' | 'legacy_password' | 'create_new' {
    if (!user) {
      return 'create_new';
    }

    if (user.srpUpgraded && user.srpSalt && user.srpVerifier) {
      return 'srp';
    }

    return 'legacy_password';
  }

  // Returns:
  //     [userDto, refreshToken]
  async login(
    username: string,
    password: string,
    ip: string,
    userAgent: string | undefined,
    isLegacyAuth: boolean = false,
  ): Promise<[UserDto, string]> {
    const user = await this.findUserRecordByUsernameOrThrow(username);

    // 使用公共认证方法
    const { verified } = await this.authenticateUserWithPassword(
      user,
      username,
      password,
      !isLegacyAuth, // 只有在非legacy模式下才自动升级
    );

    if (!verified) {
      throw new PasswordNotMatchError(username);
    }

    // 如果用户启用了 2FA，需要进行风险评估
    if (user.totpEnabled) {
      const requireTOTP = await this.shouldRequire2FA(user.id, ip, userAgent);

      if (requireTOTP) {
        const tempToken = this.totpService.generateTempToken(user.id);
        throw new TOTPRequiredError(username, tempToken);
      }
    }

    // Login successfully.
    await this.prismaService.userLoginLog.create({
      data: {
        userId: user.id,
        ip,
        userAgent,
      },
    });
    return [
      await this.getUserDtoById(user.id, user.id, ip, userAgent),
      await this.createSession(user.id),
    ];
  }

  // 新增风险评估方法
  private async shouldRequire2FA(
    userId: number,
    ip: string,
    userAgent: string | undefined,
  ): Promise<boolean> {
    // 首先检查用户是否开启了"始终要求2FA"
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { totpAlwaysRequired: true },
    });

    if (user?.totpAlwaysRequired) {
      return true;
    }

    // 其他风险评估逻辑保持不变
    const isKnownIP = await this.prismaService.userLoginLog.findFirst({
      where: {
        userId,
        ip,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const isKnownDevice =
      userAgent &&
      (await this.prismaService.userLoginLog.findFirst({
        where: {
          userId,
          userAgent,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }));

    if (!isKnownIP || !isKnownDevice) {
      return true;
    }

    const hasSensitiveOperation =
      await this.prismaService.userResetPasswordLog.findFirst({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

    return !!hasSensitiveOperation;
  }

  // 新增：验证 TOTP 并完成登录
  async verifyTOTPAndLogin(
    tempToken: string,
    code: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[UserDto, string, boolean]> {
    try {
      // 验证临时 token
      const auth = this.authService.verify(tempToken);
      const userId = auth.userId;

      // 验证 token 的权限
      await this.authService.audit(
        tempToken,
        'verify',
        userId,
        'users/totp:verify',
      );

      // 验证 TOTP 代码
      const { isValid, usedBackupCode } = await this.totpService.verify2FA(
        userId,
        code,
      );
      if (!isValid) {
        throw new TOTPInvalidError();
      }

      // 记录登录日志
      await this.prismaService.userLoginLog.create({
        data: {
          userId,
          ip,
          userAgent,
        },
      });

      // 返回用户信息和新的 session
      return [
        await this.getUserDtoById(userId, userId, ip, userAgent),
        await this.createSession(userId),
        usedBackupCode,
      ];
    } catch (error) {
      if (error instanceof TOTPInvalidError) {
        throw error;
      }
      throw new TOTPTempTokenInvalidError();
    }
  }

  private async createSession(userId: number): Promise<string> {
    const authorization: Authorization =
      await this.usersPermissionService.getAuthorizationForUser(userId);
    return this.sessionService.createSession(userId, authorization);
  }

  async sendResetPasswordEmail(
    email: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<void> {
    // Check email.
    if (isEmail(email) == false) {
      throw new InvalidEmailAddressError(email);
    }
    if ((await this.emailRuleService.isEmailSuffixSupported(email)) == false) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (user == undefined) {
      await this.createPasswordResetLog(
        UserResetPasswordLogType.RequestFailDueToNoneExistentEmail,
        undefined,
        ip,
        userAgent,
      );
      throw new EmailNotFoundError(email);
    }
    const token = this.authService.sign(
      {
        userId: user.id,
        username: user.username,
        permissions: [
          {
            authorizedActions: ['modify'],
            authorizedResource: {
              ownedByUser: user.id,
              types: ['users/password:reset'],
              resourceIds: undefined,
              data: Date.now(),
            },
          },
        ],
      },
      this.passwordResetEmailValidSeconds,
    );
    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        user.username,
        token,
      );
    } catch {
      throw new EmailSendFailedError(email);
    }
    await this.createPasswordResetLog(
      UserResetPasswordLogType.RequestSuccess,
      user.id,
      ip,
      userAgent,
    );
  }

  async verifyAndResetPassword(
    token: string,
    srpSalt: string,
    srpVerifier: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<void> {
    // Here, we do not need to check whether the token is valid.
    // If we check, then, if the token is invalid, it won't be logged.
    const userId = this.authService.decode(token).authorization.userId;
    try {
      await this.authService.audit(
        token,
        'modify',
        userId,
        'users/password:reset',
        undefined,
      );
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        await this.createPasswordResetLog(
          UserResetPasswordLogType.FailDueToInvalidToken,
          userId,
          ip,
          userAgent,
        );
        Logger.warn(
          `Permission denied when reset password: token = "${token}", ip = "${ip}", userAgent = "${userAgent}"`,
        );
      }
      if (e instanceof TokenExpiredError) {
        await this.createPasswordResetLog(
          UserResetPasswordLogType.FailDueToExpiredRequest,
          userId,
          ip,
          userAgent,
        );
      }
      throw e;
    }

    // Operation permitted.
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
    /* istanbul ignore if */
    if (user == undefined) {
      await this.createPasswordResetLog(
        UserResetPasswordLogType.FailDueToNoUser,
        userId,
        ip,
        userAgent,
      );
      throw new Error(
        `In an password reset attempt, the operation ` +
          `is permitted, but the user is not found! There are 4 possible reasons:\n` +
          `1. The user is deleted right after a password reset request.\n` +
          `2. There is a bug in the code.\n` +
          `3. The database is corrupted.\n` +
          `4. We are under attack!`,
      );
    }

    // 更新用户的 SRP 凭证和最后修改密码时间
    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedPassword: '', // 清除旧的密码哈希
        srpSalt,
        srpVerifier,
        srpUpgraded: true,
        lastPasswordChangedAt: new Date(),
      },
    });

    await this.createPasswordResetLog(
      UserResetPasswordLogType.Success,
      userId,
      ip,
      userAgent,
    );
  }

  async updateUserProfile(
    userId: number,
    nickname: string,
    intro: string,
    avatarId: number,
  ): Promise<void> {
    this.logger.log(`Attempting to update profile for user ID: ${userId}`);
    const [, profile] =
      await this.findUserRecordAndProfileRecordOrThrow(userId);

    if ((await this.avatarsService.isAvatarExists(avatarId)) === false) {
      this.logger.warn(`Avatar not found: ${avatarId} for user: ${userId}`);
      throw new AvatarNotFoundError(avatarId);
    }

    const oldAvatarId = profile.avatarId;

    if (
      profile.nickname !== nickname ||
      profile.intro !== intro ||
      profile.avatarId !== avatarId
    ) {
      await this.prismaService.userProfile.update({
        where: {
          userId,
        },
        data: {
          nickname,
          intro,
          avatarId,
        },
      });
      this.logger.log(`Profile successfully updated for user ID: ${userId}`);

      try {
        const publishedCount = await this.redis.publish(
          USER_PROFILE_UPDATE_CHANNEL,
          userId.toString(),
        );
        this.logger.log(
          `Published cache invalidation message for user ID: ${userId} to channel '${USER_PROFILE_UPDATE_CHANNEL}'. Received by ${publishedCount} clients.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to publish cache invalidation message for user ID: ${userId} to Redis channel '${USER_PROFILE_UPDATE_CHANNEL}'`,
          error instanceof Error ? error.stack : error,
        );
      }

      if (oldAvatarId !== avatarId) {
        try {
          await Promise.all([
            this.avatarsService.plusUsageCount(avatarId),
            this.avatarsService.minusUsageCount(oldAvatarId),
          ]);
          this.logger.log(
            `Updated avatar usage counts for user ID: ${userId}. New: ${avatarId}, Old: ${oldAvatarId}`,
          );
        } catch (avatarError) {
          this.logger.error(
            `Error updating avatar usage counts for user ID ${userId}`,
            avatarError instanceof Error ? avatarError.stack : avatarError,
          );
        }
      }
    } else {
      this.logger.log(
        `Profile data unchanged for user ID: ${userId}. Skipping update and cache invalidation.`,
      );
    }
  }

  async getUniqueFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<UserFollowingRelationship | undefined> {
    let relationships =
      await this.prismaService.userFollowingRelationship.findMany({
        where: {
          followerId,
          followeeId,
        },
      });
    /* istanbul ignore if */
    if (relationships.length > 1) {
      Logger.warn(
        `There are more than one follow relationship between user ${followerId} and user ${followeeId}. Automaticly clean them up...`,
      );
      await this.prismaService.userFollowingRelationship.updateMany({
        where: {
          followerId,
          followeeId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      const result = await this.prismaService.userFollowingRelationship.create({
        data: {
          followerId,
          followeeId,
        },
      });
      relationships = [result];
    }
    return relationships.length == 0 ? undefined : relationships[0];
  }

  async addFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<void> {
    if (followerId == followeeId) {
      throw new FollowYourselfError();
    }
    if ((await this.isUserExists(followerId)) == false) {
      throw new UserIdNotFoundError(followerId);
    }
    if ((await this.isUserExists(followeeId)) == false) {
      throw new UserIdNotFoundError(followeeId);
    }
    const oldRelationship = await this.getUniqueFollowRelationship(
      followerId,
      followeeId,
    );
    if (oldRelationship != null) {
      throw new UserAlreadyFollowedError(followeeId);
    }
    await this.prismaService.userFollowingRelationship.create({
      data: {
        followerId,
        followeeId,
      },
    });
  }

  async deleteFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<void> {
    const relationship = await this.getUniqueFollowRelationship(
      followerId,
      followeeId,
    );
    if (relationship == undefined) {
      throw new UserNotFollowedYetError(followeeId);
    }
    await this.prismaService.userFollowingRelationship.updateMany({
      where: {
        followerId,
        followeeId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getFollowers(
    followeeId: number,
    firstFollowerId: number | undefined, // undefined if from start
    pageSize: number,
    viewerId: number | undefined, // optional
    ip: string,
    userAgent: string | undefined, // optional
  ): Promise<[UserDto[], PageDto]> {
    if (firstFollowerId == undefined) {
      const relations =
        await this.prismaService.userFollowingRelationship.findMany({
          where: {
            followeeId,
          },
          take: pageSize + 1,
          orderBy: { followerId: 'asc' },
        });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getUserDtoById(r.followerId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevRelationshipsPromise =
        this.prismaService.userFollowingRelationship.findMany({
          where: {
            followeeId,
            followerId: { lt: firstFollowerId },
          },
          take: pageSize,
          orderBy: { followerId: 'desc' },
        });
      const queriedRelationsPromise =
        this.prismaService.userFollowingRelationship.findMany({
          where: {
            followeeId,
            followerId: { gte: firstFollowerId },
          },
          take: pageSize + 1,
          orderBy: { followerId: 'asc' },
        });
      const DTOs = await Promise.all(
        (await queriedRelationsPromise).map((r) => {
          return this.getUserDtoById(r.followerId, viewerId, ip, userAgent);
        }),
      );
      const prev = await prevRelationshipsPromise;
      return PageHelper.PageMiddle(
        prev,
        DTOs,
        pageSize,
        (i) => i.followerId,
        (i) => i.id,
      );
    }
  }

  async getFollowees(
    followerId: number,
    firstFolloweeId: number | undefined, // undefined if from start
    pageSize: number,
    viewerId: number | undefined, // optional
    ip: string, // optional
    userAgent: string | undefined, // optional
  ): Promise<[UserDto[], PageDto]> {
    if (firstFolloweeId == undefined) {
      const relations =
        await this.prismaService.userFollowingRelationship.findMany({
          where: {
            followerId,
          },
          take: pageSize + 1,
          orderBy: { followeeId: 'asc' },
        });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getUserDtoById(r.followeeId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevRelationshipsPromise =
        this.prismaService.userFollowingRelationship.findMany({
          where: {
            followerId,
            followeeId: { lt: firstFolloweeId },
          },
          take: pageSize,
          orderBy: { followeeId: 'desc' },
        });
      const queriedRelationsPromise =
        this.prismaService.userFollowingRelationship.findMany({
          where: {
            followerId,
            followeeId: { gte: firstFolloweeId },
          },
          take: pageSize + 1,
          orderBy: { followeeId: 'asc' },
        });
      const DTOs = await Promise.all(
        (await queriedRelationsPromise).map((r) => {
          return this.getUserDtoById(r.followeeId, viewerId, ip, userAgent);
        }),
      );
      const prev = await prevRelationshipsPromise;
      return PageHelper.PageMiddle(
        prev,
        DTOs,
        pageSize,
        (i) => i.followeeId,
        (i) => i.id,
      );
    }
  }

  async isUserExists(userId: number): Promise<boolean> {
    return (await this.prismaService.user.count({ where: { id: userId } })) > 0;
  }

  async getFollowingCount(followerId: number): Promise<number> {
    return await this.prismaService.userFollowingRelationship.count({
      where: {
        followerId,
      },
    });
  }

  async getFollowedCount(followeeId: number): Promise<number> {
    return await this.prismaService.userFollowingRelationship.count({
      where: {
        followeeId,
      },
    });
  }

  async isUserFollowUser(
    followerId: number | undefined,
    followeeId: number | undefined,
  ): Promise<boolean> {
    if (followerId == undefined || followeeId == undefined) return false;
    const result = await this.prismaService.userFollowingRelationship.count({
      where: {
        followerId,
        followeeId,
      },
    });
    assert(result == 0 || result == 1);
    return result > 0;
  }

  async verifySudo(
    req: Request,
    token: string,
    method: 'password' | 'srp' | 'passkey' | 'totp',
    credentials: {
      password?: string;
      clientPublicEphemeral?: string;
      clientProof?: string;
      passkeyResponse?: AuthenticationResponseJSON;
      code?: string;
    },
  ): Promise<{
    accessToken: string;
    salt?: string;
    serverPublicEphemeral?: string;
    serverProof?: string;
    srpUpgraded?: boolean;
  }> {
    const userId = this.authService.decode(token).authorization.userId;
    let verified = false;

    if (method === 'password') {
      const user = await this.findUserRecordOrThrow(userId);

      // 验证密码
      if (!credentials.password) {
        throw new Error('Password is required for password verification');
      }

      // 使用公共认证方法
      const { verified: passwordVerified, wasUpgraded } =
        await this.authenticateUserWithPassword(
          user,
          user.username,
          credentials.password,
          true, // 启用自动SRP升级
        );

      verified = passwordVerified;

      if (verified) {
        const sudoToken = await this.authService.issueSudoToken(token);
        return {
          accessToken: sudoToken,
          srpUpgraded: wasUpgraded,
        };
      }
    } else if (method === 'srp') {
      const user = await this.findUserRecordOrThrow(userId);

      if (!user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
        throw new SrpNotUpgradedError(user.username);
      }

      // 如果是第一步（初始化），返回 salt 和服务器公钥
      if (!credentials.clientProof && !credentials.clientPublicEphemeral) {
        const { serverEphemeral } = await this.srpService.createServerSession(
          user.srpVerifier,
        );

        // 将服务器的私密临时值存储在 session 中
        req.session.srpSession = {
          serverSecretEphemeral: serverEphemeral.secret,
        };

        return {
          accessToken: token, // 返回原 token，因为验证还未完成
          salt: user.srpSalt,
          serverPublicEphemeral: serverEphemeral.public,
        };
      }

      // 如果是第二步（验证），验证客户端证明
      if (credentials.clientProof && credentials.clientPublicEphemeral) {
        const sessionState = req.session.srpSession;
        if (!sessionState) {
          throw new Error('SRP session not found. Please initialize first.');
        }

        const { success, serverProof } = await this.srpService.verifyClient(
          sessionState.serverSecretEphemeral,
          credentials.clientPublicEphemeral,
          user.srpSalt,
          user.username,
          user.srpVerifier,
          credentials.clientProof,
        );

        // 清除 session 中的 SRP 状态
        delete req.session.srpSession;

        if (!success) {
          throw new SrpVerificationError();
        }

        verified = true;
        const sudoToken = await this.authService.issueSudoToken(token);
        return {
          accessToken: sudoToken,
          serverProof,
        };
      }

      throw new Error('Invalid SRP credentials');
    } else if (method === 'passkey') {
      verified = await this.verifyPasskeyAuthentication(
        req,
        credentials.passkeyResponse!,
      );
    } else if (method === 'totp') {
      const { isValid } = await this.totpService.verify2FA(
        userId,
        credentials.code!,
      );
      verified = isValid;
    }

    if (!verified) {
      throw new InvalidCredentialsError();
    }

    // 签发带有 sudo 权限的新 token
    const sudoToken = await this.authService.issueSudoToken(token);
    return { accessToken: sudoToken };
  }

  /**
   * 处理 SRP 登录的第一步：初始化
   * 客户端发送用户名和公钥 A，服务器返回该用户的 salt 和服务器生成的公钥 B
   */
  async handleSrpInit(username: string): Promise<{
    salt: string;
    serverPublicEphemeral: string;
    serverSecretEphemeral: string;
  }> {
    const user = await this.findUserRecordByUsernameOrThrow(username);

    if (!user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
      throw new SrpNotUpgradedError(username);
    }

    // 创建 SRP 服务器会话
    const { serverEphemeral } = await this.srpService.createServerSession(
      user.srpVerifier,
    );

    return {
      salt: user.srpSalt,
      serverPublicEphemeral: serverEphemeral.public,
      serverSecretEphemeral: serverEphemeral.secret,
    };
  }

  /**
   * 处理 SRP 登录的第二步：验证
   * 客户端发送其证明 M1，服务器验证并返回其证明 M2
   */
  async handleSrpVerify(
    username: string,
    clientPublicEphemeral: string,
    clientProof: string,
    serverSecretEphemeral: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<{
    serverProof: string;
    accessToken: string;
    requires2FA: boolean;
    tempToken?: string;
    user?: UserDto;
  }> {
    const user = await this.findUserRecordByUsernameOrThrow(username);

    if (!user.srpUpgraded || !user.srpSalt || !user.srpVerifier) {
      throw new SrpNotUpgradedError(username);
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
      throw new SrpVerificationError();
    }

    // 记录登录日志
    await this.prismaService.userLoginLog.create({
      data: {
        userId: user.id,
        ip,
        userAgent,
      },
    });

    // 获取用户信息
    const userDto = await this.getUserDtoById(user.id, user.id, ip, userAgent);

    // 检查是否需要 2FA
    if (user.totpEnabled) {
      const requireTOTP = await this.shouldRequire2FA(user.id, ip, userAgent);
      if (requireTOTP) {
        const tempToken = this.totpService.generateTempToken(user.id);
        return {
          serverProof,
          accessToken: '', // 2FA 时不返回 access token
          requires2FA: true,
          tempToken,
          user: userDto,
        };
      }
    }

    // 生成访问令牌
    const accessToken = await this.createSession(user.id);

    return {
      serverProof,
      accessToken,
      requires2FA: false,
      user: userDto,
    };
  }

  /**
   * 为新注册用户创建会话
   */
  async createSessionForNewUser(userId: number): Promise<string> {
    const authorization =
      await this.usersPermissionService.getAuthorizationForUser(userId);
    return this.sessionService.createSession(userId, authorization);
  }

  async changePassword(
    userId: number,
    srpSalt: string,
    srpVerifier: string,
  ): Promise<void> {
    const user = await this.findUserRecordOrThrow(userId);

    // 更新 SRP 凭证和最后修改密码时间
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        hashedPassword: '', // 清除旧的密码哈希
        srpSalt,
        srpVerifier,
        srpUpgraded: true,
        lastPasswordChangedAt: new Date(),
      },
    });
  }

  /**
   * OAuth 用户登录/注册处理
   * 如果邮箱已存在，返回验证所需信息；否则创建新用户
   */
  async loginWithOAuth(
    providerId: string,
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<
    | [OAuthUserDto, string] // 成功登录/注册
    | {
        requiresVerification: true;
        verificationType: 'password' | 'srp';
        email: string;
        sessionId: string;
        salt?: string;
        serverPublicEphemeral?: string;
      } // 需要验证
  > {
    // 1. 检查是否已有OAuth连接
    const existingConnection =
      await this.prismaService.userOAuthConnection.findUnique({
        where: {
          providerId_providerUserId: {
            providerId,
            providerUserId: userInfo.id,
          },
        },
        include: {
          user: {
            include: {
              userProfile: true,
            },
          },
        },
      });

    // 如果已有连接，直接登录
    if (existingConnection) {
      return this.handleExistingOAuthConnection(
        existingConnection,
        userInfo,
        ip,
        userAgent,
      );
    }

    // 2. 检查邮箱是否冲突（仅当OAuth提供了邮箱时）
    if (userInfo.email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: userInfo.email },
        include: { userProfile: true },
      });

      if (existingUser && !existingUser.deletedAt) {
        // 邮箱冲突，需要验证身份
        if (existingUser.srpUpgraded) {
          // SRP用户，启动SRP验证
          return this.initOAuthSrpVerification(
            providerId,
            userInfo,
            existingUser,
          );
        } else {
          // 传统用户，需要密码验证
          return this.initOAuthPasswordVerification(
            providerId,
            userInfo,
            existingUser,
          );
        }
      }
    }

    // 3. 没有冲突，创建新用户
    return this.createNewOAuthUser(providerId, userInfo, ip, userAgent);
  }

  /**
   * 初始化OAuth密码验证（传统用户）
   */
  private async initOAuthPasswordVerification(
    providerId: string,
    userInfo: OAuthUserInfo,
    existingUser: any,
  ): Promise<{
    requiresVerification: true;
    verificationType: 'password';
    email: string;
    sessionId: string;
  }> {
    const sessionId = this.generateOAuthSessionId(
      'password',
      providerId,
      userInfo.id,
    );

    const sessionData = {
      type: 'password',
      providerId,
      userInfo,
      existingUserId: existingUser.id,
      existingUsername: existingUser.username,
    };

    const redis = this.redisService.getOrThrow();
    await redis.setex(
      `oauth_session:${sessionId}`,
      15 * 60,
      JSON.stringify(sessionData),
    );

    return {
      requiresVerification: true,
      verificationType: 'password',
      email: existingUser.email,
      sessionId,
    };
  }

  /**
   * 初始化OAuth SRP验证
   */
  private async initOAuthSrpVerification(
    providerId: string,
    userInfo: OAuthUserInfo,
    existingUser: any,
  ): Promise<{
    requiresVerification: true;
    verificationType: 'srp';
    email: string;
    sessionId: string;
    salt: string;
    serverPublicEphemeral: string;
  }> {
    const sessionId = this.generateOAuthSessionId(
      'srp',
      providerId,
      userInfo.id,
    );

    // 创建SRP服务器会话
    const serverSession = await this.srpService.createServerSession(
      existingUser.srpVerifier,
    );

    const sessionData = {
      type: 'srp',
      providerId,
      userInfo,
      existingUserId: existingUser.id,
      serverEphemeral: serverSession.serverEphemeral,
    };

    const redis = this.redisService.getOrThrow();
    await redis.setex(
      `oauth_session:${sessionId}`,
      15 * 60,
      JSON.stringify(sessionData),
    );

    return {
      requiresVerification: true,
      verificationType: 'srp',
      email: existingUser.email,
      sessionId,
      salt: existingUser.srpSalt,
      serverPublicEphemeral: serverSession.serverEphemeral.public,
    };
  }

  /**
   * 生成OAuth会话ID
   */
  private generateOAuthSessionId(
    type: 'password' | 'srp' | 'binding',
    providerId: string,
    providerUserId: string,
  ): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `oauth_${type}_${providerId}_${providerUserId}_${timestamp}_${random}`;
  }

  /**
   * 统一的OAuth验证完成处理
   */
  async completeOAuthVerification(
    sessionId: string,
    credentials: {
      password?: string;
      clientPublicEphemeral?: string;
      clientProof?: string;
    },
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> {
    const redis = this.redisService.getOrThrow();
    const sessionData = await redis.get(`oauth_session:${sessionId}`);

    if (!sessionData) {
      throw new Error('OAuth session not found or expired');
    }

    const session = JSON.parse(sessionData);

    // 立即删除会话数据防止重放攻击
    await redis.del(`oauth_session:${sessionId}`);

    if (session.type === 'password') {
      return this.completePasswordVerification(
        session,
        credentials.password!,
        ip,
        userAgent,
      );
    } else if (session.type === 'srp') {
      return this.completeSrpVerification(
        session,
        credentials.clientPublicEphemeral!,
        credentials.clientProof!,
        ip,
        userAgent,
      );
    } else {
      throw new Error('Invalid session type');
    }
  }

  /**
   * 完成密码验证（传统用户自动升级）
   */
  private async completePasswordVerification(
    session: any,
    password: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> {
    const user = await this.findUserRecordOrThrow(session.existingUserId);

    // 验证密码并自动升级到SRP
    const { verified, wasUpgraded } = await this.authenticateUserWithPassword(
      user,
      user.username,
      password,
      true,
    );

    if (!verified) {
      throw new PasswordNotMatchError(user.username);
    }

    // 创建OAuth连接
    await this.createOAuthConnection(
      session.existingUserId,
      session.providerId,
      session.userInfo,
    );

    // 记录登录日志
    await this.prismaService.userLoginLog.create({
      data: {
        userId: session.existingUserId,
        ip,
        userAgent,
      },
    });

    const userDto = await this.getOAuthUserDtoById(
      session.existingUserId,
      session.existingUserId,
      ip,
      userAgent,
    );
    const refreshToken = await this.createSession(session.existingUserId);

    return [userDto, refreshToken];
  }

  /**
   * 完成SRP验证
   */
  private async completeSrpVerification(
    session: any,
    clientPublicEphemeral: string,
    clientProof: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> {
    // 获取用户信息以进行SRP验证
    const user = await this.findUserRecordOrThrow(session.existingUserId);

    if (!user.srpSalt || !user.srpVerifier) {
      throw new SrpNotUpgradedError(user.username);
    }

    // 验证SRP证明
    const { success } = await this.srpService.verifyClient(
      session.serverEphemeral.secret,
      clientPublicEphemeral,
      user.srpSalt,
      user.username,
      user.srpVerifier,
      clientProof,
    );

    if (!success) {
      throw new SrpVerificationError();
    }

    // 创建OAuth连接
    await this.createOAuthConnection(
      session.existingUserId,
      session.providerId,
      session.userInfo,
    );

    // 记录登录日志
    await this.prismaService.userLoginLog.create({
      data: {
        userId: session.existingUserId,
        ip,
        userAgent,
      },
    });

    const userDto = await this.getOAuthUserDtoById(
      session.existingUserId,
      session.existingUserId,
      ip,
      userAgent,
    );
    const refreshToken = await this.createSession(session.existingUserId);

    return [userDto, refreshToken];
  }

  /**
   * 创建OAuth连接
   */
  private async createOAuthConnection(
    userId: number,
    providerId: string,
    userInfo: OAuthUserInfo,
  ): Promise<void> {
    // 检查是否已存在连接
    const existing = await this.prismaService.userOAuthConnection.findUnique({
      where: {
        providerId_providerUserId: {
          providerId,
          providerUserId: userInfo.id,
        },
      },
    });

    if (!existing) {
      await this.prismaService.userOAuthConnection.create({
        data: {
          userId,
          providerId,
          providerUserId: userInfo.id,
          rawProfile: userInfo as any,
        },
      });
    }
  }

  /**
   * 处理已存在的 OAuth 连接
   */
  private async handleExistingOAuthConnection(
    existingConnection: any,
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> {
    // 用户已存在，检查是否有 profile
    if (!existingConnection.user.userProfile) {
      this.logger.warn(
        `User ${existingConnection.user.id} has OAuth connection but no profile, creating default profile`,
      );
      await this.createDefaultProfileForUser(existingConnection.user.id);
    }

    // 记录登录日志
    await this.prismaService.userLoginLog.create({
      data: {
        userId: existingConnection.user.id,
        ip,
        userAgent,
      },
    });

    // 更新连接的原始资料
    await this.prismaService.userOAuthConnection.update({
      where: { id: existingConnection.id },
      data: {
        rawProfile: userInfo as any,
        updatedAt: new Date(),
      },
    });

    return [
      await this.getOAuthUserDtoById(
        existingConnection.user.id,
        existingConnection.user.id,
        ip,
        userAgent,
      ),
      await this.createSession(existingConnection.user.id),
    ];
  }

  /**
   * 为 OAuth 用户创建新账户
   */
  private async createNewOAuthUser(
    providerId: string,
    userInfo: OAuthUserInfo,
    ip: string,
    userAgent: string | undefined,
  ): Promise<[OAuthUserDto, string]> {
    this.logger.log(
      `Creating new user for OAuth login from provider: ${providerId}`,
    );

    // 生成唯一用户名
    const baseUsername = this.generateOAuthUsername(userInfo);
    const uniqueUsername = await this.generateUniqueUsername(baseUsername);

    // 获取默认头像
    const avatarId = await this.avatarsService.getDefaultAvatarId();

    // 生成随机密码（用户不会使用，仅为占位）
    const randomPassword = this.generateRandomPassword();
    const hashedPassword = bcrypt.hashSync(randomPassword, 10);

    // 在事务中创建用户、profile 和 OAuth 连接
    const result = await this.prismaService.$transaction(async (tx) => {
      // 为没有email的用户生成唯一占位符email
      let userEmail = userInfo.email;
      if (!userEmail) {
        // 生成格式：oauth-{providerId}-{providerUserId}@placeholder.internal
        userEmail = `oauth-${providerId}-${userInfo.id}@placeholder.internal`;
      }

      // 创建用户
      const newUser = await tx.user.create({
        data: {
          username: uniqueUsername,
          email: userEmail,
          hashedPassword,
          srpUpgraded: false, // OAuth 用户默认未升级到 SRP
        },
      });

      // 创建用户 profile
      const nickname = (
        userInfo.name ||
        userInfo.preferredUsername ||
        uniqueUsername
      ).substring(0, 255); // 限制nickname长度为255个字符

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          nickname,
          intro: this.defaultIntro,
          avatarId,
        },
      });

      // 创建 OAuth 连接
      await tx.userOAuthConnection.create({
        data: {
          userId: newUser.id,
          providerId,
          providerUserId: userInfo.id,
          rawProfile: userInfo as any,
        },
      });

      // 记录注册日志
      await tx.userRegisterLog.create({
        data: {
          type: 'Success',
          email: userInfo.email || '',
          ip,
          userAgent,
        },
      });

      // 记录登录日志
      await tx.userLoginLog.create({
        data: {
          userId: newUser.id,
          ip,
          userAgent,
        },
      });

      return newUser;
    });

    this.logger.log(
      `Created new user ${result.username} (ID: ${result.id}) for OAuth provider: ${providerId}`,
    );

    return [
      await this.getOAuthUserDtoById(result.id, result.id, ip, userAgent),
      await this.createSession(result.id),
    ];
  }

  /**
   * 根据 OAuth 用户信息生成用户名基础
   */
  private generateOAuthUsername(userInfo: OAuthUserInfo): string {
    if (
      userInfo.preferredUsername &&
      this.isValidUsername(userInfo.preferredUsername)
    ) {
      return userInfo.preferredUsername;
    }

    if (userInfo.username && this.isValidUsername(userInfo.username)) {
      return userInfo.username;
    }

    if (userInfo.name) {
      // 清理名称：去除特殊字符，转为小写
      const cleaned = userInfo.name
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      if (cleaned.length >= 4 && this.isValidUsername(cleaned)) {
        return cleaned;
      }
    }

    // 如果都不可用，使用默认格式
    return `user_${userInfo.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * 生成唯一用户名
   */
  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    // 确保用户名长度符合要求
    let username = baseUsername;
    if (username.length < 4) {
      username = `user_${username}`;
    }
    if (username.length > 32) {
      username = username.substring(0, 32);
    }

    // 检查是否已存在
    let counter = 0;
    let uniqueUsername = username;

    while (await this.isUsernameRegistered(uniqueUsername)) {
      counter++;
      const suffix = `_${counter}`;
      const maxBaseLength = 32 - suffix.length;
      uniqueUsername = username.substring(0, maxBaseLength) + suffix;
    }

    return uniqueUsername;
  }

  /**
   * 生成随机密码
   */
  private generateRandomPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(crypto.randomInt(chars.length));
    }
    return password;
  }

  /**
   * 为用户创建默认 profile
   */
  private async createDefaultProfileForUser(userId: number): Promise<void> {
    const avatarId = await this.avatarsService.getDefaultAvatarId();
    const user = await this.findUserRecordOrThrow(userId);

    await this.prismaService.userProfile.create({
      data: {
        userId,
        nickname: user.username,
        intro: this.defaultIntro,
        avatarId,
      },
    });
  }

  /**
   * 初始化OAuth绑定流程（已登录用户）
   */
  async initOAuthBinding(
    userId: number,
    providerId: string,
    state?: string,
  ): Promise<{ bindingSessionId: string }> {
    // 验证用户存在
    const user = await this.findUserRecordOrThrow(userId);

    // 生成绑定会话ID
    const bindingSessionId = this.generateOAuthSessionId(
      'binding',
      providerId,
      userId.toString(),
    );

    // 存储绑定会话信息
    const sessionData = {
      type: 'binding',
      userId,
      providerId,
      originalState: state,
      createdAt: new Date().toISOString(),
    };

    const redis = this.redisService.getOrThrow();
    await redis.setex(
      `oauth_binding_session:${bindingSessionId}`,
      15 * 60, // 15分钟过期
      JSON.stringify(sessionData),
    );

    return { bindingSessionId };
  }

  /**
   * 处理OAuth绑定回调
   */
  async handleOAuthBindingCallback(
    providerId: string,
    userInfo: OAuthUserInfo,
    bindingSessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    // 验证绑定会话
    const redis = this.redisService.getOrThrow();
    const sessionData = await redis.get(
      `oauth_binding_session:${bindingSessionId}`,
    );

    if (!sessionData) {
      throw new Error('Binding session not found or expired');
    }

    const session = JSON.parse(sessionData);
    if (session.type !== 'binding' || session.providerId !== providerId) {
      throw new Error('Invalid binding session');
    }

    const userId = session.userId;

    // 检查该OAuth账户是否已被其他用户绑定
    const existingConnection =
      await this.prismaService.userOAuthConnection.findUnique({
        where: {
          providerId_providerUserId: {
            providerId,
            providerUserId: userInfo.id,
          },
        },
      });

    if (existingConnection) {
      if (existingConnection.userId === userId) {
        // 用户试图绑定已经绑定的账户
        await redis.del(`oauth_binding_session:${bindingSessionId}`);
        return {
          success: false,
          message: 'This OAuth account is already linked to your account',
        };
      } else {
        // OAuth账户已被其他用户绑定
        await redis.del(`oauth_binding_session:${bindingSessionId}`);
        return {
          success: false,
          message: 'This OAuth account is already linked to another user',
        };
      }
    }

    // 检查用户是否已经绑定了同一提供商的其他账户
    const existingProviderConnection =
      await this.prismaService.userOAuthConnection.findFirst({
        where: {
          userId,
          providerId,
        },
      });

    if (existingProviderConnection) {
      await redis.del(`oauth_binding_session:${bindingSessionId}`);
      return {
        success: false,
        message: `You have already linked another ${providerId} account. Please unbind it first.`,
      };
    }

    // 创建OAuth连接
    await this.createOAuthConnection(userId, providerId, userInfo);

    // 清理会话
    await redis.del(`oauth_binding_session:${bindingSessionId}`);

    this.logger.log(
      `User ${userId} successfully bound OAuth account: ${providerId}:${userInfo.id}`,
    );

    return {
      success: true,
      message: 'OAuth account linked successfully',
    };
  }

  /**
   * 获取用户的OAuth连接列表
   */
  async getUserOAuthConnections(userId: number): Promise<
    Array<{
      id: number;
      providerId: string;
      providerName: string;
      providerUserId: string;
      connectedAt: string;
    }>
  > {
    const connections = await this.prismaService.userOAuthConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 提供商名称映射
    const providerNames: Record<string, string> = {
      github: 'GitHub',
      google: 'Google',
      ruc: 'RUC',
      // 可以根据需要添加更多提供商
    };

    return connections.map((conn) => ({
      id: conn.id,
      providerId: conn.providerId,
      providerName: providerNames[conn.providerId] || conn.providerId,
      providerUserId: conn.providerUserId,
      connectedAt: conn.createdAt.toISOString(),
    }));
  }

  /**
   * 解除OAuth绑定
   */
  async unbindOAuth(
    userId: number,
    connectionId: number,
  ): Promise<{ success: boolean; unboundConnectionId: number }> {
    // 验证连接是否属于该用户
    const connection = await this.prismaService.userOAuthConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new Error(
        'OAuth connection not found or does not belong to this user',
      );
    }

    // 检查是否是用户唯一的登录方式
    const userConnections = await this.prismaService.userOAuthConnection.count({
      where: { userId },
    });

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { hashedPassword: true, srpUpgraded: true },
    });

    // 如果用户没有密码且这是唯一的OAuth连接，不允许解绑
    if (!user?.hashedPassword && userConnections === 1) {
      throw new Error(
        'Cannot unbind the only authentication method. Please set a password first.',
      );
    }

    // 删除OAuth连接
    await this.prismaService.userOAuthConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(
      `User ${userId} unbound OAuth connection ${connectionId} (${connection.providerId}:${connection.providerUserId})`,
    );

    return {
      success: true,
      unboundConnectionId: connectionId,
    };
  }
}

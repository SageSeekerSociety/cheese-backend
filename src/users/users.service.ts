/*
 *  Description: This file implements the UsersService class.
 *               It is responsible for the business logic of users.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

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
import assert from 'node:assert';
import { AnswerService } from '../answer/answer.service';
import {
  InvalidCredentialsError,
  PermissionDeniedError,
  TokenExpiredError,
} from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { Authorization } from '../auth/definitions';
import { SessionService } from '../auth/session.service';
import { AvatarNotFoundError } from '../avatars/avatars.error';
import { AvatarsService } from '../avatars/avatars.service';
import { PageDto } from '../common/DTO/page-response.dto';
import { PageHelper } from '../common/helper/page.helper';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailRuleService } from '../email/email-rule.service';
import { EmailService } from '../email/email.service';
import { QuestionsService } from '../questions/questions.service';
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

@Injectable()
export class UsersService {
  constructor(
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
  ) {}

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
      code += Math.floor(Math.random() * 10).toString()[0];
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

    // 验证密码
    if (!bcrypt.compareSync(password, user.hashedPassword!)) {
      throw new PasswordNotMatchError(username);
    }

    // 如果用户还没升级到 SRP,则自动升级
    if (!user.srpUpgraded && !isLegacyAuth) {
      await this.srpService.upgradeUserToSrp(user.id, username, password);
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
    const [, profile] =
      await this.findUserRecordAndProfileRecordOrThrow(userId);
    if ((await this.avatarsService.isAvatarExists(avatarId)) == false) {
      throw new AvatarNotFoundError(avatarId);
    }
    await this.avatarsService.plusUsageCount(avatarId);
    await this.avatarsService.minusUsageCount(profile.avatarId);
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
      verified = await bcrypt.compare(
        credentials.password,
        user.hashedPassword!,
      );

      if (verified) {
        // 如果用户还没升级到 SRP，自动升级
        let wasUpgraded = false;
        if (!user.srpUpgraded) {
          await this.srpService.upgradeUserToSrp(
            user.id,
            user.username,
            credentials.password,
          );
          wasUpgraded = true;
        }

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
}

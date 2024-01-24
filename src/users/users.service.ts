/*
 *  Description: This file implements the UsersService class.
 *               It is responsible for the business logic of users.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PermissionDeniedError } from '../auth/auth.error';
import {
  AuthService,
  Authorization,
  AuthorizedAction,
} from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { PageRespondDto } from '../common/DTO/page-respond.dto';
import { PageHelper } from '../common/helper/page.helper';
import { UserDto } from './DTO/user.dto';
import { EmailService } from './email.service';
import {
  User,
  UserFollowingRelationship,
  UserLoginLog,
  UserProfile,
  UserProfileQueryLog,
  UserRegisterLog,
  UserRegisterLogType,
  UserRegisterRequest,
  UserResetPasswordLog,
  UserResetPasswordLogType,
} from './users.entity';
import {
  AlreadyFollowedError,
  BadRequestError,
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
  NotFollowedYetError,
  PasswordNotMatchError,
  UserIdNotFoundError,
  UserNoProfileError,
  UsernameAlreadyRegisteredError,
  UsernameNotFoundError,
} from './users.error';

@Injectable()
export class UsersService {
  constructor(
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserFollowingRelationship)
    private readonly userFollowingRepository: Repository<UserFollowingRelationship>,
    @InjectRepository(UserRegisterRequest)
    private readonly userRegisterRequestRepository: Repository<UserRegisterRequest>,
    @InjectRepository(UserLoginLog)
    private readonly userLoginLogRepository: Repository<UserLoginLog>,
    @InjectRepository(UserProfileQueryLog)
    private readonly userProfileQueryLogRepository: Repository<UserProfileQueryLog>,
    @InjectRepository(UserRegisterLog)
    private readonly userRegisterLogRepository: Repository<UserRegisterLog>,
    @InjectRepository(UserResetPasswordLog)
    private readonly userResetPasswordLogRepository: Repository<UserResetPasswordLog>,
  ) {}

  private generateVerifyCode(): string {
    let code: string = '';
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10).toString()[0];
    }
    return code;
  }

  private isEmailSuffixSupported(email: string): boolean {
    // support only @ruc.edu.cn currently
    return email.endsWith('@ruc.edu.cn');
  }

  get emailSuffixRule(): string {
    return 'Only @ruc.edu.cn is supported currently.';
  }

  async sendRegisterEmailCode(
    email: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    if (isEmail(email) == false) {
      const log = this.userRegisterLogRepository.create({
        type: UserRegisterLogType.RequestFailDueToInvalidEmail,
        email: email,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userRegisterLogRepository.save(log);
      throw new InvalidEmailAddressError(
        email,
        'Email should look like someone@example.com',
      );
    }
    if (this.isEmailSuffixSupported(email) == false) {
      const log = this.userRegisterLogRepository.create({
        type: UserRegisterLogType.RequestFailDueToNotSupportedEmail,
        email: email,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userRegisterLogRepository.save(log);
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    // TODO: Add logic to determain whether code is sent too frequently.

    // Determine whether the email is registered.
    if ((await this.userRepository.findOneBy({ email })) != null) {
      const log = this.userRegisterLogRepository.create({
        type: UserRegisterLogType.RequestFailDueToAlreadyRegistered,
        email: email,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userRegisterLogRepository.save(log);
      throw new EmailAlreadyRegisteredError(email);
    }

    // Now, email is valid, supported and not registered.
    // We can send the verify code.
    const code = this.generateVerifyCode();
    try {
      await this.emailService.sendRegisterCode(email, code);
      const requestRecord = this.userRegisterRequestRepository.create({
        email: email,
        code: code,
      });
      await this.userRegisterRequestRepository.save(requestRecord);
      const log = this.userRegisterLogRepository.create({
        type: UserRegisterLogType.RequestSuccess,
        email: email,
        registerRequestId: requestRecord.id,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userRegisterLogRepository.save(log);
    } catch (e) {
      const log = this.userRegisterLogRepository.create({
        type: UserRegisterLogType.RequestFailDueToSendEmailFailure,
        email: email,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userRegisterLogRepository.save(log);
      throw new EmailSendFailedError(email);
    }
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
    return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\x00-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]).{8,}$/.test(
      password,
    );
  }

  get passwordRule(): string {
    return 'Password must be 8 characters long and must contain at least one letter, one special character and one number.';
  }

  private isCodeExpired(createdAt: Date): boolean {
    return new Date().getTime() - createdAt.getTime() > 10 * 60 * 1000;
  }

  get codeExpiredRule(): string {
    return 'Code expires after 10 minutes.';
  }

  get defaultAvatar(): string {
    return 'default.jpg';
  }

  get defaultIntro(): string {
    return 'This user has not set an introduction yet.';
  }

  async register(
    username: string,
    nickname: string,
    password: string,
    email: string,
    emailCode: string,
    ip: string,
    userAgent: string,
  ): Promise<UserDto> {
    // todo: validate username, nickname, password, email, emailCode
    if (this.isValidUsername(username) == false) {
      throw new InvalidUsernameError(username, this.usernameRule);
    }
    if (this.isValidNickname(nickname) == false) {
      throw new InvalidNicknameError(nickname, this.nicknameRule);
    }
    if (this.isValidPassword(password) == false) {
      throw new InvalidPasswordError(this.passwordRule);
    }
    if (isEmail(email) == false) {
      throw new InvalidEmailAddressError(
        email,
        'Email should look like someone@example.com',
      );
    }
    if (this.isEmailSuffixSupported(email) == false) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    // Determine whether the email code is correct.
    const records = await this.userRegisterRequestRepository.find({
      where: { email: email },
    });
    for (const record of records) {
      if (this.isCodeExpired(record.createdAt)) {
        // Delete expired code.
        await this.userRegisterRequestRepository.delete(record);
        const log = this.userRegisterLogRepository.create({
          type: UserRegisterLogType.FailDueToExpired,
          email: email,
          registerRequestId: record.id,
          ip: ip,
          userAgent: userAgent,
        });
        await this.userRegisterLogRepository.save(log);
        continue;
      }
      // For code that is netheir expired nor matched, just ignore it.
      if (record.code == emailCode) {
        // Both email and code are correct, and the code is not expired.
        // The register request is valid, maybe not successful, but valid.
        // Thus, the code is used and should be deleted.
        const requestId = record.id;
        await this.userRegisterRequestRepository.delete(record.id);

        // Verify whether the email is registered.
        if ((await this.userRepository.findOneBy({ email })) != null) {
          const log = this.userRegisterLogRepository.create({
            type: UserRegisterLogType.FailDueToEmailExistence,
            email: email,
            registerRequestId: requestId,
            ip: ip,
            userAgent: userAgent,
          });
          await this.userRegisterLogRepository.save(log);
          throw new EmailAlreadyRegisteredError(email);
        }

        // Verify whether the username is registered.
        if ((await this.userRepository.findOneBy({ username })) != null) {
          const log = this.userRegisterLogRepository.create({
            type: UserRegisterLogType.FailDueToUserExistence,
            email: email,
            registerRequestId: requestId,
            ip: ip,
            userAgent: userAgent,
          });
          await this.userRegisterLogRepository.save(log);
          throw new UsernameAlreadyRegisteredError(username);
        }

        // Now, the request is valid, email is not registered, username is not registered.
        // We can register the user.
        const salt = bcrypt.genSaltSync(10);
        const user = this.userRepository.create({
          username: username,
          hashedPassword: bcrypt.hashSync(password, salt),
          email: email,
        });
        await this.userRepository.save(user);
        const profile = this.userProfileRepository.create({
          user: user,
          nickname: nickname,
          avatar: this.defaultAvatar,
          intro: this.defaultIntro,
        });
        await this.userProfileRepository.save(profile);
        const log = this.userRegisterLogRepository.create({
          type: UserRegisterLogType.Success,
          email: email,
          registerRequestId: requestId,
          ip: ip,
          userAgent: userAgent,
        });
        await this.userRegisterLogRepository.save(log);
        return {
          id: user.id,
          username: user.username,
          nickname: profile.nickname,
          avatar: profile.avatar,
          intro: profile.intro,
        };
      }
    }
    // No match code is found.
    const log = this.userRegisterLogRepository.create({
      type: UserRegisterLogType.FailDueToWrongCode,
      email: email,
      ip: ip,
      userAgent: userAgent,
    });
    await this.userRegisterLogRepository.save(log);
    throw new CodeNotMatchError(email, emailCode);
  }

  async getUserDtoById(
    userId: number,
    viewer: number,
    ip: string,
    userAgent: string,
  ): Promise<UserDto> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user == null) {
      throw new UserIdNotFoundError(userId);
    }

    const profile = await this.userProfileRepository.findOneBy({ userId });
    if (profile == null) {
      Logger.error(`User '${user.username}' DO NOT has a profile!`);
      throw new UserNoProfileError(userId);
    }
    const log = this.userProfileQueryLogRepository.create({
      viewerId: viewer,
      vieweeId: userId,
      ip: ip,
      userAgent: userAgent,
    });
    await this.userProfileQueryLogRepository.save(log);
    return {
      id: user.id,
      username: user.username,
      nickname: profile.nickname,
      avatar: profile.avatar,
      intro: profile.intro,
    };
  }

  // Returns:
  //     [userDto, refreshToken]
  async login(
    username: string,
    password: string,
    ip: string,
    userAgent: string,
  ): Promise<[UserDto, string]> {
    const user = await this.userRepository.findOneBy({ username });
    if (user == null) {
      throw new UsernameNotFoundError(username);
    }
    if (bcrypt.compareSync(password, user.hashedPassword) == false) {
      throw new PasswordNotMatchError(username);
    }
    // Login successfully.
    const profile = await this.userProfileRepository.findOneBy({
      userId: user.id,
    });
    if (profile == null) {
      Logger.error(`User '${user.username}' DO NOT has a profile!`);
      return [
        {
          id: user.id,
          username: user.username,
          nickname: '',
          avatar: '',
          intro: '',
        },
        await this.createSession(user.id),
      ];
    }
    const log = this.userLoginLogRepository.create({
      user: user,
      ip: ip,
      userAgent: userAgent,
    });
    await this.userLoginLogRepository.save(log);
    return [
      {
        id: user.id,
        username: user.username,
        nickname: profile.nickname,
        avatar: profile.avatar,
        intro: profile.intro,
      },
      await this.createSession(user.id),
    ];
  }

  private createSession(userId: number): Promise<string> {
    const authorization: Authorization = {
      userId: userId,
      permissions: [
        {
          authorizedActions: [AuthorizedAction.query],
          authorizedResource: {
            ownedByUser: userId,
            types: null,
            resourceIds: null,
          },
        },
        {
          authorizedActions: [AuthorizedAction.modify],
          authorizedResource: {
            ownedByUser: userId,
            types: ['users/profile'],
            resourceIds: null,
          },
        },
        {
          authorizedActions: [AuthorizedAction.create, AuthorizedAction.delete],
          authorizedResource: {
            ownedByUser: userId,
            types: ['users/following'],
            resourceIds: null,
          },
        },
      ],
    };
    return this.sessionService.createSession(userId, authorization);
  }

  get passwordResetEmailValidSeconds(): number {
    return 60 * 10; // 10 minutes
  }

  async sendResetPasswordEmail(
    email: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    // Check email.
    if (isEmail(email) == false) {
      throw new InvalidEmailAddressError(
        email,
        'Email should look like someone@example.com',
      );
    }
    if (this.isEmailSuffixSupported(email) == false) {
      throw new InvalidEmailSuffixError(email, this.emailSuffixRule);
    }

    // Find email.
    const user = await this.userRepository.findOneBy({ email });
    if (user == null) {
      const log = this.userResetPasswordLogRepository.create({
        type: UserResetPasswordLogType.RequestFailDueToNoneExistentEmail,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userResetPasswordLogRepository.save(log);
      throw new EmailNotFoundError(email);
    }
    /*
    const request = this.userResetPasswordRequestRepository.create({
      user: user
    })
    this.userResetPasswordRequestRepository.save(request);
    */
    const token = this.authService.sign(
      {
        userId: user.id,
        permissions: [
          {
            authorizedActions: [AuthorizedAction.modify],
            authorizedResource: {
              ownedByUser: user.id,
              types: ['users/password:reset'],
              resourceIds: null,
              data: Date.now(),
            },
          },
        ],
      },
      this.passwordResetEmailValidSeconds,
    );
    try {
      await this.emailService.sendPasswordResetEmail(email, token);
    } catch {
      throw new EmailSendFailedError(email);
    }
    const log = this.userResetPasswordLogRepository.create({
      type: UserResetPasswordLogType.RequestSuccess,
      ip: ip,
      userAgent: userAgent,
    });
    await this.userResetPasswordLogRepository.save(log);
  }

  async verifyAndResetPassword(
    token: string,
    newPassword: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const decoded = this.authService.verify(token);
    const userId = decoded.userId;
    try {
      this.authService.audit(
        token,
        AuthorizedAction.modify,
        userId,
        'users/password:reset',
        null,
      );
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        const log = this.userResetPasswordLogRepository.create({
          type: UserResetPasswordLogType.FailDurToInvalidToken,
          ip: ip,
          userAgent: userAgent,
        });
        await this.userResetPasswordLogRepository.save(log);
      }
      if (e instanceof TokenExpiredError) {
        const log = this.userResetPasswordLogRepository.create({
          type: UserResetPasswordLogType.FailDueToExpiredRequest,
          ip: ip,
          userAgent: userAgent,
        });
        await this.userResetPasswordLogRepository.save(log);
      }
      throw e;
    }

    // Operation permitted.

    // Check password.
    if (this.isValidPassword(newPassword) == false) {
      throw new InvalidPasswordError(this.passwordRule);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (user == null) {
      const log = this.userResetPasswordLogRepository.create({
        type: UserResetPasswordLogType.FailDueToNoUser,
        userId: userId,
        ip: ip,
        userAgent: userAgent,
      });
      await this.userResetPasswordLogRepository.save(log);
      throw new UserIdNotFoundError(userId);
    }
    const salt = bcrypt.genSaltSync(10);
    user.hashedPassword = bcrypt.hashSync(newPassword, salt);
    this.userRepository.save(user);
    const log = this.userResetPasswordLogRepository.create({
      type: UserResetPasswordLogType.Success,
      userId: userId,
      ip: ip,
      userAgent: userAgent,
    });
    await this.userResetPasswordLogRepository.save(log);
  }

  async updateUserProfile(
    userId: number,
    nickname: string,
    avatar: string,
    intro: string,
  ): Promise<void> {
    const profile = await this.userProfileRepository.findOneBy({ userId });
    if (profile == null) {
      throw new UserIdNotFoundError(userId);
    }
    profile.nickname = nickname;
    profile.avatar = avatar;
    profile.intro = intro;
    await this.userProfileRepository.save(profile);
  }

  async getFollowerCount(userId: number): Promise<number> {
    return await this.userFollowingRepository.countBy({ followeeId: userId });
  }

  async getFolloweeCount(userId: number): Promise<number> {
    return await this.userFollowingRepository.countBy({ followerId: userId });
  }

  async addFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<void> {
    const follower = await this.userRepository.findOneBy({ id: followerId });
    if (follower == null) {
      throw new UserIdNotFoundError(followerId);
    }
    const followee = await this.userRepository.findOneBy({ id: followeeId });
    if (followee == null) {
      throw new UserIdNotFoundError(followeeId);
    }
    if (followerId == followeeId) {
      throw new FollowYourselfError();
    }
    if (
      (await this.userFollowingRepository.findOneBy({
        followerId,
        followeeId,
      })) != null
    ) {
      throw new AlreadyFollowedError(followeeId);
    }
    const relationship = this.userFollowingRepository.create({
      follower: follower,
      followee: followee,
    });
    await this.userFollowingRepository.save(relationship);
  }

  async deleteFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<void> {
    const relationship = await this.userFollowingRepository.findOneBy({
      followerId,
      followeeId,
    });
    if (relationship == null) {
      throw new NotFollowedYetError(followeeId);
    }
    await this.userFollowingRepository.softRemove(relationship);
  }

  async getFollowers(
    followeeId: number,
    firstFollowerId: number, // null if from start
    pageSize: number,
    viewerId: number, // nullable
    ip: string,
    userAgent: string,
  ): Promise<[UserDto[], PageRespondDto]> {
    if (pageSize <= 0) {
      throw new BadRequestError('pageSize should be positive number');
    }
    if (firstFollowerId == null) {
      const relations = await this.userFollowingRepository.find({
        where: { followeeId: followeeId },
        take: pageSize + 1,
        order: { followerId: 'ASC' },
      });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getUserDtoById(r.followerId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevRelationshipsPromise = this.userFollowingRepository.find({
        where: {
          followeeId: followeeId,
          followerId: LessThan(firstFollowerId),
        },
        take: pageSize,
        order: { followerId: 'DESC' },
      });
      const queriedRelationsPromise = this.userFollowingRepository.find({
        where: {
          followeeId: followeeId,
          followerId: MoreThanOrEqual(firstFollowerId),
        },
        take: pageSize + 1,
        order: { followerId: 'ASC' },
      });
      const DTOs = await Promise.all(
        (await queriedRelationsPromise).map((r) => {
          return this.getUserDtoById(r.followerId, viewerId, ip, userAgent);
        }),
      );
      const prev = await prevRelationshipsPromise;
      return PageHelper.Page(
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
    firstFolloweeId: number, // null if from start
    pageSize: number,
    viewerId: number, // nullable
    ip: string,
    userAgent: string,
  ): Promise<[UserDto[], PageRespondDto]> {
    if (pageSize <= 0) {
      throw new BadRequestError('pageSize should be positive number');
    }
    if (firstFolloweeId == null) {
      const relations = await this.userFollowingRepository.find({
        where: { followerId: followerId },
        take: pageSize + 1,
        order: { followeeId: 'ASC' },
      });
      const DTOs = await Promise.all(
        relations.map((r) => {
          return this.getUserDtoById(r.followeeId, viewerId, ip, userAgent);
        }),
      );
      return PageHelper.PageStart(DTOs, pageSize, (item) => item.id);
    } else {
      const prevRelationshipsPromise = this.userFollowingRepository.find({
        where: {
          followerId: followerId,
          followeeId: LessThan(firstFolloweeId),
        },
        take: pageSize,
        order: { followeeId: 'DESC' },
      });
      const queriedRelationsPromise = this.userFollowingRepository.find({
        where: {
          followerId: followerId,
          followeeId: MoreThanOrEqual(firstFolloweeId),
        },
        take: pageSize + 1,
        order: { followeeId: 'ASC' },
      });
      const DTOs = await Promise.all(
        (await queriedRelationsPromise).map((r) => {
          return this.getUserDtoById(r.followeeId, viewerId, ip, userAgent);
        }),
      );
      const prev = await prevRelationshipsPromise;
      return PageHelper.Page(
        prev,
        DTOs,
        pageSize,
        (i) => i.followeeId,
        (i) => i.id,
      );
    }
  }
}

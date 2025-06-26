/*
 * Description: Unit tests for Users Error classes
 *
 * Author(s):
 *      HuanCheng65
 */

import { BaseError } from '../common/error/base-error';
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
  InvalidPublicKeyError,
  InvalidUsernameError,
  OAuthAccountChoiceRequiredError,
  OAuthLegacyPasswordRequiredError,
  OAuthSrpVerificationRequiredError,
  PasskeyNotFoundError,
  PasskeyVerificationFailedError,
  PasswordNotMatchError,
  SrpNotUpgradedError,
  SrpVerificationError,
  TOTPInvalidError,
  TOTPRequiredError,
  TOTPTempTokenInvalidError,
  UpdateAvatarError,
  UserAlreadyFollowedError,
  UserIdNotFoundError,
  UsernameAlreadyRegisteredError,
  UsernameNotFoundError,
  UserNotFollowedYetError,
} from './users.error';

describe('Users Error Classes', () => {
  describe('InvalidEmailAddressError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'invalid-email';
      const error = new InvalidEmailAddressError(email);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidEmailAddressError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(
        `Invalid email address: ${email}. Email should look like someone@example.com`,
      );
      expect(error.email).toBe(email);
    });
  });

  describe('InvalidEmailSuffixError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@invalid.com';
      const rule = 'Only @ruc.edu.cn emails are allowed';
      const error = new InvalidEmailSuffixError(email, rule);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidEmailSuffixError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(`Invalid email suffix: ${email}. ${rule}`);
      expect(error.email).toBe(email);
      expect(error.rule).toBe(rule);
    });
  });

  describe('EmailAlreadyRegisteredError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const error = new EmailAlreadyRegisteredError(email);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('EmailAlreadyRegisteredError');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe(`Email already registered: ${email}`);
      expect(error.email).toBe(email);
    });
  });

  describe('EmailSendFailedError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const error = new EmailSendFailedError(email);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('EmailSendFailedError');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(`Failed to send email to ${email}`);
      expect(error.email).toBe(email);
    });
  });

  describe('InvalidUsernameError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'invalid@user';
      const rule =
        'Username must contain only letters, numbers, and underscores';
      const error = new InvalidUsernameError(username, rule);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidUsernameError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(`Invalid username: ${username}. ${rule}`);
      expect(error.username).toBe(username);
      expect(error.rule).toBe(rule);
    });
  });

  describe('InvalidNicknameError', () => {
    it('should create error with correct message and status code', () => {
      const nickname = '';
      const rule = 'Nickname cannot be empty';
      const error = new InvalidNicknameError(nickname, rule);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidNicknameError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(`Invalid nickname: ${nickname}. ${rule}`);
      expect(error.nickname).toBe(nickname);
      expect(error.rule).toBe(rule);
    });
  });

  describe('InvalidPasswordError', () => {
    it('should create error with correct message and status code', () => {
      const rule = 'Password must be at least 8 characters long';
      const error = new InvalidPasswordError(rule);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidPasswordError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(`Invalid password. ${rule}`);
      expect(error.rule).toBe(rule);
    });
  });

  describe('UsernameAlreadyRegisteredError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'testuser';
      const error = new UsernameAlreadyRegisteredError(username);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UsernameAlreadyRegisteredError');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe(`Username already registered: ${username}`);
      expect(error.username).toBe(username);
    });
  });

  describe('CodeNotMatchError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const code = '123456';
      const error = new CodeNotMatchError(email, code);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('CodeNotMatchError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(`Code not match: ${email}, ${code}`);
      expect(error.email).toBe(email);
      expect(error.code).toBe(code);
    });
  });

  describe('UserIdNotFoundError', () => {
    it('should create error with correct message and status code', () => {
      const userId = 123;
      const error = new UserIdNotFoundError(userId);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UserIdNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(`User with id ${userId} not found`);
      expect(error.userId).toBe(userId);
    });
  });

  describe('UsernameNotFoundError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'nonexistent';
      const error = new UsernameNotFoundError(username);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UsernameNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(`User with username ${username} not found`);
      expect(error.username).toBe(username);
    });
  });

  describe('PasswordNotMatchError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'testuser';
      const error = new PasswordNotMatchError(username);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('PasswordNotMatchError');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(`Password not match for user ${username}`);
      expect(error.username).toBe(username);
    });
  });

  describe('EmailNotFoundError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const error = new EmailNotFoundError(email);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('EmailNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(`Email not found: ${email}`);
      expect(error.email).toBe(email);
    });
  });

  describe('UserNotFollowedYetError', () => {
    it('should create error with correct message and status code', () => {
      const followeeId = 456;
      const error = new UserNotFollowedYetError(followeeId);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UserNotFollowedYetError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(
        `User with id ${followeeId} is not followed yet.`,
      );
      expect(error.followeeId).toBe(followeeId);
    });
  });

  describe('FollowYourselfError', () => {
    it('should create error with correct message and status code', () => {
      const error = new FollowYourselfError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('FollowYourselfError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Cannot follow yourself.');
    });
  });

  describe('UserAlreadyFollowedError', () => {
    it('should create error with correct message and status code', () => {
      const followeeId = 789;
      const error = new UserAlreadyFollowedError(followeeId);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UserAlreadyFollowedError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(
        `User with id ${followeeId} already followed.`,
      );
      expect(error.followeeId).toBe(followeeId);
    });
  });

  describe('UpdateAvatarError', () => {
    it('should create error with correct message and status code', () => {
      const error = new UpdateAvatarError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('UpdateAvatarError');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Can not use avatar loaded by others.');
    });
  });

  describe('ChallengeNotFoundError', () => {
    it('should create error with correct message and status code', () => {
      const error = new ChallengeNotFoundError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('ChallengeNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Challenge not found');
    });
  });

  describe('PasskeyVerificationFailedError', () => {
    it('should create error with correct message and status code', () => {
      const error = new PasskeyVerificationFailedError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('PasskeyVerificationFailedError');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Passkey verification failed');
    });
  });

  describe('PasskeyNotFoundError', () => {
    it('should create error with correct message and status code', () => {
      const credentialId = 'long-credential-id-string';
      const error = new PasskeyNotFoundError(credentialId);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('PasskeyNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(
        `Passkey not found. ID: ${credentialId.substring(0, 8)}...`,
      );
    });
  });

  describe('TOTPRequiredError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'testuser';
      const tempToken = 'temp-token-123';
      const error = new TOTPRequiredError(username, tempToken);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('TOTPRequiredError');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(
        `2FA verification required for user '${username}'`,
      );
      expect(error.tempToken).toBe(tempToken);
    });
  });

  describe('TOTPInvalidError', () => {
    it('should create error with correct message and status code', () => {
      const error = new TOTPInvalidError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('TOTPInvalidError');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid 2FA code');
    });
  });

  describe('TOTPTempTokenInvalidError', () => {
    it('should create error with correct message and status code', () => {
      const error = new TOTPTempTokenInvalidError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('TOTPTempTokenInvalidError');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(
        'Invalid or expired temporary token for 2FA verification',
      );
    });
  });

  describe('SrpNotUpgradedError', () => {
    it('should create error with correct message and status code', () => {
      const username = 'legacyuser';
      const error = new SrpNotUpgradedError(username);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('SrpNotUpgradedError');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(
        `User ${username} has not been upgraded to SRP authentication.`,
      );
    });
  });

  describe('SrpVerificationError', () => {
    it('should create error with correct message and status code', () => {
      const error = new SrpVerificationError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('SrpVerificationError');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('SRP verification failed.');
    });
  });

  describe('OAuthSrpVerificationRequiredError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const providerId = 'google';
      const salt = 'salt123';
      const serverPublicEphemeral = 'server-public-123';
      const srpSessionId = 'srp-session-123';
      const error = new OAuthSrpVerificationRequiredError(
        email,
        providerId,
        salt,
        serverPublicEphemeral,
        srpSessionId,
      );

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('OAuthSrpVerificationRequiredError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(
        `OAuth login requires SRP verification for email: ${email}`,
      );
      expect(error.email).toBe(email);
      expect(error.providerId).toBe(providerId);
      expect(error.salt).toBe(salt);
      expect(error.serverPublicEphemeral).toBe(serverPublicEphemeral);
      expect(error.srpSessionId).toBe(srpSessionId);
    });
  });

  describe('OAuthLegacyPasswordRequiredError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const providerId = 'github';
      const oauthSessionId = 'oauth-session-123';
      const error = new OAuthLegacyPasswordRequiredError(
        email,
        providerId,
        oauthSessionId,
      );

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('OAuthLegacyPasswordRequiredError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe(
        `OAuth login requires password verification and SRP upgrade for email: ${email}`,
      );
      expect(error.email).toBe(email);
      expect(error.providerId).toBe(providerId);
      expect(error.oauthSessionId).toBe(oauthSessionId);
    });
  });

  describe('OAuthAccountChoiceRequiredError', () => {
    it('should create error with correct message and status code', () => {
      const email = 'test@example.com';
      const providerId = 'microsoft';
      const oauthUserInfo = { id: '123', name: 'Test User' };
      const existingUsername = 'existing-user';
      const error = new OAuthAccountChoiceRequiredError(
        email,
        providerId,
        oauthUserInfo,
        existingUsername,
      );

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('OAuthAccountChoiceRequiredError');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe(
        `Email ${email} is already registered. Account choice required.`,
      );
      expect(error.email).toBe(email);
      expect(error.providerId).toBe(providerId);
      expect(error.oauthUserInfo).toBe(oauthUserInfo);
      expect(error.existingUsername).toBe(existingUsername);
    });
  });

  describe('InvalidPublicKeyError', () => {
    it('should create error with correct message and status code', () => {
      const error = new InvalidPublicKeyError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('InvalidPublicKeyError');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Invalid public key provided.');
    });
  });
});

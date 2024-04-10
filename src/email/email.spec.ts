/*
 *  Description: This file provide unit tests for email module.
 *
 *               It is NOT ENABLED by default, and can be enabled by setting EMAILTEST_ENABLE to true.
 *               You need to set EMAILTEST_RECEIVER to let the test know where to send the email.
 *
 *               We recommend you to manually check whether you have received the email.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { EmailService } from './email.service';

if (process.env.EMAILTEST_ENABLE == 'true') {
  const receiver = process.env.EMAILTEST_RECEIVER as string;
  describe('Email Module', () => {
    let app: TestingModule;
    let emailService: EmailService;
    beforeAll(async () => {
      app = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      emailService = app.get<EmailService>(EmailService);
    });
    afterAll(async () => {
      await app.close();
    });

    it('should send a password reset email', async () => {
      await emailService.sendPasswordResetEmail(
        receiver,
        'test_username',
        'a_jwt_token_that_is_very_very_very_very_very_long',
      );
    });

    it('should send a register code email', async () => {
      await emailService.sendRegisterCode(receiver, '123456');
    });
  });
} else {
  it('Email test is disabled', () => {});
}

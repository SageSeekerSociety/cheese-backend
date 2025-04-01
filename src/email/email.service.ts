/*
 *  Description: This file implements the EmailService class.
 *               It checks email address and then sends emails.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailRuleService } from './email-rule.service';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly emailRuleService: EmailRuleService,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    await this.emailRuleService.emailPolicyEnsure(email);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset',
        template: './password-reset.english.hbs',
        context: {
          username,
          resetUrl:
            this.configService.get('frontendBaseUrl') +
            this.configService.get('passwordResetPath') +
            token,
        },
      });
    } catch (error) {
      Logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }

  async sendRegisterCode(email: string, code: string): Promise<void> {
    await this.emailRuleService.emailPolicyEnsure(email);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Register Code',
        template: './register-code.english.hbs',
        context: {
          code,
        },
      });
    } catch (error) {
      Logger.error(`Failed to send register code email to ${email}`, error);
    }
  }
}

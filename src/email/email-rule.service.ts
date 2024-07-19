/*
 *  Description: This file implements the EmailRuleService class.
 *               It is used to determine whether a given email address is valid.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

// It should be noticed that although the check rules are written in code NOW,
// it is still a good practice to write them in the configuration file, or even database.
// We plan to do so in the future.

import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { InvalidEmailAddressError } from '../users/users.error';
import { EmailPolicyViolationError } from './email.error';

@Injectable()
export class EmailRuleService {
  constructor() {}

  // support only @ruc.edu.cn currently
  readonly emailSuffix = '@ruc.edu.cn';

  async isEmailSuffixSupported(email: string): Promise<boolean> {
    return email.endsWith(this.emailSuffix);
  }

  get emailSuffixRule(): string {
    return `Only ${this.emailSuffix} is supported currently.`;
  }

  async emailPolicyEnsure(email: string): Promise<void> {
    if (isEmail(email) == false) throw new InvalidEmailAddressError(email);

    // Double check the email policy
    // Although the email policy is checked in UsersService, it is still not a bad thing to check it here.
    if ((await this.isEmailSuffixSupported(email)) == false)
      throw new EmailPolicyViolationError(email);
  }
}

/*
 *  Description: This file implements the email service.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Logger } from '@nestjs/common';
import { isEmail } from 'class-validator';

/* istanbul ignore next */
// This class cannot be tested, because it uses external service.
export class EmailService {
  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (isEmail(email) === false)
      throw new Error('Invalid email address: ' + email);

    throw new Error('Method not implemented.');
  }

  public sendRegisterCode(email: string, code: string): Promise<void> {
    if (isEmail(email) === false)
      throw new Error('Invalid email address: ' + email);

    // TODO
    Logger.log(
      `Sending verify code ${code} to ${email}... THIS IS NOT IMPLEMENTED!`,
    );

    return Promise.resolve();
  }
}

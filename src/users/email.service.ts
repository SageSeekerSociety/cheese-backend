import { Logger } from '@nestjs/common';
import { isEmail } from 'class-validator';

export class EmailService {
  constructor() { }

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

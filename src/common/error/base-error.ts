/*
 *  Description: This file defines the base error class.
 *
 *               All client errors, which is defined as errors caused by improper input,
 *               should extend this class, because the error handler
 *               will check if the error is an instance of BaseError, and if so,
 *               it will return the error message and status code to the client.
 *               Otherwise, it will return a generic error message and status code 500.
 *
 *               However, if the error is thrown because of an impossible situation,
 *               which indicates that there might be a bug in the code, curruption
 *               in the database, or even a security issue, then the error should
 *               not extends this class, because the error handler will not log the
 *               client error to the console, but it will log all other errors.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

export class BaseError extends Error {
  constructor(
    public readonly name: string, // The name of the error, e.g. 'InvalidTokenError'
    public readonly message: string, // The message of the error, e.g. 'Invalid token'
    public readonly statusCode: number, // The HTTP status code of the error, e.g. 401
  ) {
    super(message);
  }
}

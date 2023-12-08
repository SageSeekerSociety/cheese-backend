/*
 *  Description: This file defines the base error class.
 *               All the errors should extend this class, because the error handler
 *               will check if the error is an instance of BaseError, and if so,
 *               it will return the error message and status code to the client.
 *               Otherwise, it will return a generic error message and status code 500.
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

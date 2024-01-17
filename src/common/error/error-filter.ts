/*
 *  Description: This file defines the error filter.
 *               It handles the errors unhandled by the controllers
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseError } from './base-error';

/*

Usage:

@Controller('/...')
@UseFilters(new BaseErrorExceptionFilter())
export class YourControllerClass() {
  ...
}

See users.controller.ts as an example.

*/

@Catch()
export class BaseErrorExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    // console.log(exception); // for debug
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    if (exception instanceof BaseError) {
      const status = exception.statusCode || 500;
      response.status(status).json({
        code: status,
        message: `${exception.name}: ${exception.message}`,
      });
    } else if (exception instanceof BadRequestException) {
      response.status(400).json({
        code: 400,
        message: `${exception.name}: ${exception.message}`,
      });
    } else {
      Logger.error(exception.stack);
      response.status(500).json({
        code: 500,
        message: 'Internal Server Error',
      });
    }
  }
}

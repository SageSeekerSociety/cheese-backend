import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { BaseError } from './base-error';

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
        message: `${exception.name}: ${exception.message}`
      });
    } else {
      Logger.error(exception);
      response.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }
  }
}

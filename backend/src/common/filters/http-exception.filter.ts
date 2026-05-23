import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[] =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message?: string | string[] }).message ?? 'Xatolik yuz berdi'
        : 'Xatolik yuz berdi';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message =
        typeof message === 'string' && message !== 'Internal server error'
          ? message
          : 'Vaqtinchalik xatolik. Birozdan keyin qayta urinib ko‘ring.';
    }

    const body = {
      success: false,
      statusCode: status,
      path: request.url,
      message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}

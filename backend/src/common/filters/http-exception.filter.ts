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

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message?: string | string[] }).message ?? 'Xatolik yuz berdi'
        : exception instanceof Error
          ? exception.message
          : 'Xatolik yuz berdi';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status === HttpStatus.BAD_REQUEST) {
      const detail = Array.isArray(message) ? message.join('; ') : message;
      this.logger.warn(`${request.method} ${request.url} → 400: ${detail}`);
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev && exception instanceof Error && exception.message) {
        message = exception.message;
      } else {
        message =
          typeof message === 'string' && message !== 'Internal server error'
            ? message
            : 'Vaqtinchalik xatolik. Birozdan keyin qayta urinib ko‘ring.';
      }
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

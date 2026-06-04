import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { applyCorsHeadersIfAllowed } from '../common/cors-origins';
import {
  normalizeHttpExceptionBody,
  resolveApiErrorBody,
  type ApiErrorBody,
} from '../common/http-error.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private send(response: Response, request: Request, body: ApiErrorBody) {
    applyCorsHeadersIfAllowed(request, response);
    response.status(body.statusCode).json(body);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(exception.stack ?? String(raw));
      }

      const body = normalizeHttpExceptionBody(status, raw, request);
      this.send(response, request, body);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
    } else {
      this.logger.error(String(exception));
    }

    const body = resolveApiErrorBody(exception, request);
    this.send(response, request, body);
  }
}

import type { INestApplication } from '@nestjs/common';
import type { ErrorRequestHandler, Request, Response } from 'express';
import { applyCorsHeadersIfAllowed } from '../common/cors-origins';
import { resolveApiErrorBody } from '../common/http-error.util';

/** Handle body-parser / raw Express errors with the same JSON shape as GlobalExceptionFilter. */
export function registerExpressErrorMiddleware(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();

  const handler: ErrorRequestHandler = (exception, req: Request, res: Response, next) => {
    const entity = exception as { type?: string; status?: number };
    if (entity?.type !== 'entity.too.large' && entity?.status !== 413) {
      next(exception);
      return;
    }

    const body = resolveApiErrorBody(exception, req);
    applyCorsHeadersIfAllowed(req, res);
    res.status(body.statusCode).json(body);
  };

  expressApp.use(handler);
}

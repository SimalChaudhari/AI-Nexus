import * as dotenv from 'dotenv';

// .env must override stale Windows/user-level AI_PROVIDER / OPENAI_API_KEY variables.
dotenv.config({ override: true });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import { join } from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './utils/global-exception.filter';
import { registerExpressErrorMiddleware } from './utils/express-error.middleware';
import { getAllowedCorsOrigins, requireJwtSecret } from './common/cors-origins.util';
import { authRateLimitExpress } from './common/auth-rate-limit.middleware';

function resolveSslPaths(): { keyPath: string; certPath: string } | null {
  const sslDir = join(process.cwd(), 'ssl');
  let keyPath = process.env.SSL_KEY_PATH?.trim();
  let certPath = process.env.SSL_CERT_PATH?.trim();

  if (!keyPath) {
    const iscaKey = join(sslDir, 'ainexus.isca.org.sg-key.pem');
    keyPath = fs.existsSync(iscaKey) ? iscaKey : join(sslDir, 'key.pem');
  }
  if (!certPath) {
    const iscaCert = join(sslDir, 'ainexus.isca.org.sg-chain.pem');
    certPath = fs.existsSync(iscaCert) ? iscaCert : join(sslDir, 'cert.pem');
  }

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return null;
  }
  return { keyPath, certPath };
}

function getSslResolution() {
  const sslDir = join(process.cwd(), 'ssl');
  let keyPath = process.env.SSL_KEY_PATH?.trim();
  let certPath = process.env.SSL_CERT_PATH?.trim();

  if (!keyPath) {
    const iscaKey = join(sslDir, 'ainexus.isca.org.sg-key.pem');
    keyPath = fs.existsSync(iscaKey) ? iscaKey : join(sslDir, 'key.pem');
  }
  if (!certPath) {
    const iscaCert = join(sslDir, 'ainexus.isca.org.sg-chain.pem');
    certPath = fs.existsSync(iscaCert) ? iscaCert : join(sslDir, 'cert.pem');
  }

  return {
    keyPath,
    certPath,
    keyExists: fs.existsSync(keyPath),
    certExists: fs.existsSync(certPath),
  };
}

function isTrue(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    requireJwtSecret();
    const nodeEnv = process.env.NODE_ENV;
    const isDevelopment = nodeEnv === 'development';
    const port = Number(process.env.PORT) || (isDevelopment ? 5000 : 3000);
    const host = process.env.APP_HOST?.trim() || 'localhost';
    const bindHost = process.env.APP_BIND_HOST?.trim() || (isDevelopment ? 'localhost' : '0.0.0.0');
    const sslResolution = getSslResolution();
    const sslPaths = resolveSslPaths();
    const sslEnabled = isTrue(process.env.SSL_ENABLED);
    const sslDisabled = isTrue(process.env.SSL_DISABLED);
    const httpsEnabled =
      !isDevelopment &&
      !sslDisabled &&
      (sslEnabled || (nodeEnv !== undefined && nodeEnv !== 'development')) &&
      sslPaths !== null;

    const httpsOptions =
      httpsEnabled && sslPaths
        ? {
            key: fs.readFileSync(sslPaths.keyPath),
            cert: fs.readFileSync(sslPaths.certPath),
          }
        : undefined;

    const app = await NestFactory.create(
      AppModule,
      httpsOptions ? { httpsOptions } : undefined,
    );

    app.useWebSocketAdapter(new IoAdapter(app));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        // Keep whitelist sanitization but avoid rejecting multipart nested payloads
        // such as modules[] sent as JSON in FormData.
        forbidNonWhitelisted: false,
      }),
    );
    
    // Set global prefix for all routes (except root)
    app.setGlobalPrefix('api');

    app.use(cookieParser());

    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-XSS-Protection', '0');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      next();
    });

    const allowedOrigins = getAllowedCorsOrigins();
    const allowAnyOrigin = allowedOrigins.length === 0 && isDevelopment;

    app.enableCors({
      origin: (origin, callback) => {
        if (allowAnyOrigin || !origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        bootstrapLogger.warn(`CORS denied for origin: ${origin} (allowed count=${allowedOrigins.length})`);
        callback(null, false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cookie'],
      credentials: !allowAnyOrigin,
    });

    app.use('/api/auth', authRateLimitExpress);

    app.use(
      '/uploads',
      express.static(join(process.cwd(), 'public', 'uploads'), {
        index: false,
        dotfiles: 'deny',
      }),
    );

    // Webhook route needs raw body for signature verification; skip json parser for it
    const jsonBodyLimitMb = Number(process.env.JSON_BODY_LIMIT_MB);
    const jsonBodyLimit = `${Number.isFinite(jsonBodyLimitMb) && jsonBodyLimitMb > 0 ? jsonBodyLimitMb : 8}mb`;
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path === '/api/payments/webhook') return next();
      express.json({ limit: jsonBodyLimit })(req, res, next);
    });
    app.use(
      '/api/payments/webhook',
      express.raw({ type: 'application/json' }),
      (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const raw = (req as any).body;
        (req as any).rawBody = raw && Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
        try {
          req.body = (req as any).rawBody ? JSON.parse((req as any).rawBody) : {};
        } catch {
          res.status(400).send('Invalid JSON');
          return;
        }
        next();
      },
    );

    app.use(express.urlencoded({ limit: jsonBodyLimit, extended: true }));

    registerExpressErrorMiddleware(app);

    // Root route handler (before app.listen) - returns health check
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/', (req: express.Request, res: express.Response) => {
      res.json({
        status: 'ok',
        message: 'AI-Nexus Backend is running successfully',
        timestamp: new Date().toISOString(),
        service: 'AI-Nexus Backend',
        version: '1.0.0',
      });
    });

    const enableSwagger =
      isTrue(process.env.ENABLE_SWAGGER) || nodeEnv !== 'production';
    if (enableSwagger) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('AI-Nexus API')
        .setDescription('Swagger documentation for all AI-Nexus backend APIs')
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Enter JWT token',
            in: 'header',
          },
          'bearer',
        )
        .build();

      const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, swaggerDocument, {
        useGlobalPrefix: true,
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    await app.listen(port, bindHost);
    const httpServer = app.getHttpServer();
    // Video uploads can run several minutes; never leave sockets with timeout=0 (leaks connections).
    const httpTimeoutMs = Number(process.env.HTTP_TIMEOUT_MS);
    const timeoutMs =
      Number.isFinite(httpTimeoutMs) && httpTimeoutMs >= 0
        ? httpTimeoutMs
        : 10 * 60 * 1000;
    httpServer.setTimeout(timeoutMs);
    if (typeof httpServer.requestTimeout === 'number') httpServer.requestTimeout = timeoutMs;
    if (typeof httpServer.headersTimeout === 'number') {
      httpServer.headersTimeout = timeoutMs + 10_000;
    }
    if (typeof httpServer.keepAliveTimeout === 'number') {
      httpServer.keepAliveTimeout = 65_000;
    }
    const scheme = httpsEnabled ? 'https' : 'http';
    console.log('[SSL] NODE_ENV:', nodeEnv ?? '(not set)');
    console.log('[SSL] SSL_ENABLED:', sslEnabled);
    console.log('[SSL] SSL_DISABLED:', sslDisabled);
    console.log('[SSL] key path:', sslResolution.keyPath);
    console.log('[SSL] cert path:', sslResolution.certPath);
    console.log('[SSL] key exists:', sslResolution.keyExists);
    console.log('[SSL] cert exists:', sslResolution.certExists);
    console.log('[SSL] mode:', httpsEnabled ? 'HTTPS enabled' : 'HTTP fallback');
    console.log(`Server is running on: ${scheme}://${host}:${port}`);
    console.log(`Health check: ${scheme}://${host}:${port}/`);
    console.log(`API routes: ${scheme}://${host}:${port}/api`);
    if (enableSwagger) {
      console.log(`Swagger docs: ${scheme}://${host}:${port}/api/docs`);
    }

  } catch (error) {
    bootstrapLogger.error(
      'Failed to start AI-Nexus backend',
      error instanceof Error ? error.stack : String(error),
    );
    process.exit(1);
  }
}
bootstrap();


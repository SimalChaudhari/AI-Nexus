import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';
import * as fs from 'fs';
import { join } from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

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

async function bootstrap() {
  try {
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
    
    // Enable CORS
    const configuredOrigins = (process.env.FRONTEND_URLS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const fallbackOrigin = process.env.FRONTEND_URL?.trim();
    const prodDefaultOrigin = nodeEnv === 'production' ? 'https://ainexus.isca.org.sg' : '';
    const baseAllowedOrigins = configuredOrigins.length
      ? configuredOrigins
      : [fallbackOrigin || prodDefaultOrigin].filter(Boolean);
    const devLocalOrigins = [
      'http://localhost:3000',
      'http://localhost:3030',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3030',
      'http://127.0.0.1:5173',
    ];
    const allowedOrigins = isDevelopment
      ? Array.from(new Set([...baseAllowedOrigins, ...devLocalOrigins]))
      : baseAllowedOrigins;
    const allowAnyOrigin = allowedOrigins.length === 0;

    app.enableCors({
      origin: (origin, callback) => {
        if (allowAnyOrigin || !origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: !allowAnyOrigin,
    });

    // Serve static files from public/uploads directory
    app.use('/uploads', express.static(join(process.cwd(), 'public', 'uploads')));

    // Webhook route needs raw body for signature verification; skip json parser for it
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path === '/api/payments/webhook') return next();
      express.json({ limit: '50mb' })(req, res, next);
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

    app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

    await app.listen(port, bindHost);
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
    console.log(`Swagger docs: ${scheme}://${host}:${port}/api/docs`);

  } catch (error) {
    process.exit(1); // Exit the process with failure
  }
}
bootstrap();


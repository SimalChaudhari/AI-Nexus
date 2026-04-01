import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { Request, Response } from 'express';

let cachedApp: express.Express;

async function bootstrap(): Promise<express.Express> {
  if (!cachedApp) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    
    // Set global prefix for all routes
    app.setGlobalPrefix('api');
    
    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Serve static files from assets directory
    const { join } = require('path');
    app.use('/assets', express.static(join(process.cwd(), 'assets')));

    // Enable JSON body parser with increased limit for large payloads
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Root route handler (before app.init) - returns health check
    expressApp.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'AI-Nexus Backend is running successfully',
        timestamp: new Date().toISOString(),
        service: 'AI-Nexus Backend',
        version: '1.0.0',
      });
    });

    // Socket.IO / WebSockets are not supported on Vercel serverless (no persistent connections).
    // Return 503 so clients get a clear response instead of 404.
    expressApp.use('/socket.io', (_req: Request, res: Response) => {
      res.status(503).json({
        error: 'WebSockets not available',
        message: 'Socket.IO is not supported on this serverless deployment. Use a persistent server (e.g. Railway, Render) or a real-time service (e.g. Pusher, Ably) for live features.',
        code: 'WEBSOCKET_UNSUPPORTED',
      });
    });

    await app.init();
    cachedApp = expressApp;
  }
  return cachedApp;
}

export default async (req: Request, res: Response) => {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (error) {
    console.error('Error in serverless function:', error);
    // Return error response instead of crashing
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};


import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { static as serveStatic } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { CsrfGuard } from './auth/csrf.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const trustedProxies = process.env.TRUSTED_PROXY_CIDRS?.trim();
  if (trustedProxies) app.getHttpAdapter().getInstance().set('trust proxy', trustedProxies.split(',').map(value => value.trim()).filter(Boolean));
  app.use(
    '/api/auth',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.use(
    '/api/staff',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: new URL(process.env.FRONTEND_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173').origin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Noctua-Request'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalGuards(new CsrfGuard());
  app.use(
    '/api/me',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.use(
    '/api/activities',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  if (process.env.SERVE_FRONTEND === 'true') {
    const frontend = resolve(process.cwd(), '../frontend/dist');
    app.use(serveStatic(frontend, { index: false }));
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/') || !request.accepts('html')) return next();
      return response.sendFile(resolve(frontend, 'index.html'));
    });
  }
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port > 65535 || (port < 1 && !(port === 0 && process.env.NODE_ENV === 'test'))) {
    throw new Error('PORT must be an integer between 1 and 65535 (0 is allowed in tests)');
  }
  await app.listen(port);
  if (port === 0 && process.send) {
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Unable to determine test server port');
    process.send({ type: 'noctua-test-listening', port: address.port });
  }
}

void bootstrap();

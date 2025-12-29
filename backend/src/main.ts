import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { validateConfig } from './config/config.validation';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate configuration BEFORE creating the app
  // This will throw if any required environment variables are missing
  const config = validateConfig();

  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing for HttpOnly auth cookies
  app.use(cookieParser());

  // Security headers via helmet
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI frameworks
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            process.env.FRONTEND_URL || 'http://localhost:3000',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // Strict-Transport-Security: max-age=31536000; includeSubDomains
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // X-Frame-Options: DENY
      frameguard: { action: 'deny' },
      // X-Content-Type-Options: nosniff
      noSniff: true,
      // Referrer-Policy: strict-origin-when-cross-origin
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // X-XSS-Protection is deprecated but still included for older browsers
      xssFilter: true,
      // Hide X-Powered-By header
      hidePoweredBy: true,
    }),
  );

  // Enable CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // Vercel preview URLs pattern (for branch deployments)
  // Matches any *.vercel.app subdomain for flexibility with preview deployments
  // Examples: vibeia.vercel.app, frontend-delta-drab-99.vercel.app,
  //           vibeia-git-develop-username.vercel.app, project-abc123-team.vercel.app
  const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check Vercel preview URLs
      if (vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('CORS not allowed'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
    maxAge: 3600, // 1 hour
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(config.port);
  logger.log(`Backend running on http://localhost:${config.port}`);
}
bootstrap();

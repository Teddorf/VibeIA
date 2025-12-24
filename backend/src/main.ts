import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { validateConfig } from './config/config.validation';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // Validate configuration BEFORE creating the app
  // This will throw if any required environment variables are missing
  const config = validateConfig();

  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing for HttpOnly auth cookies
  app.use(cookieParser());

  // Enable CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // Vercel preview URLs pattern (for branch deployments)
  // Matches: vibeia.vercel.app, vibeia-*.vercel.app, frontend-*.vercel.app
  const vercelPreviewPattern = /^https:\/\/(vibeia|frontend)[a-z0-9-]*\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
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

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('CORS not allowed'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
    maxAge: 3600, // 1 hour
  });

  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }));

  await app.listen(config.port);
  console.log(`Backend running on http://localhost:${config.port}`);
}
bootstrap();

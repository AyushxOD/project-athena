// Location: server/src/main.ts
// This is the final, most robust version.

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL,      // Your main Vercel URL
    'http://localhost:3000',       // For local development
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Remove any trailing slash from the incoming origin before checking
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      
      if (allowedOrigins.includes(normalizedOrigin)) {
        // If the origin is in our whitelist, allow it.
        callback(null, true);
      } else {
        // Otherwise, block it.
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
// Location: server/src/main.ts
// This is the complete, final, and most robust version.

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- THIS IS THE DEFINITIVE FIX ---
  // It handles all variations of the frontend URL.

  // 1. Get the frontend URL from the environment, and create a version without a trailing slash.
  const frontendUrl = process.env.FRONTEND_URL;
  const normalizedFrontendUrl = frontendUrl ? frontendUrl.replace(/\/$/, '') : null;

  // 2. Create the list of all URLs that are allowed to connect.
  const allowedOrigins = [
    'http://localhost:3000', // For your local development
  ];
  if (normalizedFrontendUrl) {
    allowedOrigins.push(normalizedFrontendUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // If the incoming origin is in our allowed list, permit it.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        // Otherwise, reject it.
        console.error(`CORS error: Request from origin ${origin} was blocked.`);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // --- END OF FIX ---

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
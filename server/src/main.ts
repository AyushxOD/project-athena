// Location: server/src/main.ts
// This is the complete and final version with a robust CORS configuration.

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- THIS IS THE DEFINITIVE FIX ---
  // We create a list of all the frontend URLs that our backend should trust.
  const allowedOrigins = [
    process.env.FRONTEND_URL, // Your main Vercel URL from Render's environment variables
    'http://localhost:3000',   // For your local development
  ];

  app.enableCors({
    // We pass the list of trusted URLs to the origin property.
    origin: (origin, callback) => {
      // If the incoming request's origin is in our list, allow it.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Otherwise, block it.
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // --- END OF FIX ---

  // This line correctly uses the PORT from the environment.
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
// Location: server/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // V V V V V  ADD THIS LINE RIGHT HERE  V V V V V
  app.enableCors({
    origin: process.env.FRONTEND_URL, // We will set this on Render
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
    // ^ ^ ^ ^ ^  THIS IS THE PERMISSION SLIP  ^ ^ ^ ^ ^

  await app.listen(process.env.PORT || 3001);}
bootstrap();
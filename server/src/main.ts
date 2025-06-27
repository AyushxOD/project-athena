// Location: server/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // V V V V V  ADD THIS LINE RIGHT HERE  V V V V V
  app.enableCors();
  // ^ ^ ^ ^ ^  THIS IS THE PERMISSION SLIP  ^ ^ ^ ^ ^

  await app.listen(3001);
}
bootstrap();
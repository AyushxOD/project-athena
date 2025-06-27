// Location: server/src/app.module.ts

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database.module';
import { AppGateway } from './app.gateway';
import { HttpModule } from '@nestjs/axios'; // <-- MAKE SURE THIS IMPORT IS HERE

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HttpModule, // <-- AND MAKE SURE THIS IS IN THE IMPORTS ARRAY
  ],
  controllers: [AppController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
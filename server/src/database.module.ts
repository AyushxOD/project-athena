// Location: server/src/database.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as postgres from 'postgres'; // <--- THE FIX IS HERE

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'PG_CONNECTION',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is not set in the .env file');
        }
        // This line now works correctly because of the new import style
        const sql = postgres(connectionString);
        console.log('Database connection established!');
        return sql;
      },
    },
  ],
  exports: ['PG_CONNECTION'],
})
export class DatabaseModule {}
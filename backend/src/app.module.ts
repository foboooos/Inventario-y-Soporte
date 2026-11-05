import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AcademicModule } from './academics/academic.module.js';
import { SoftwareModule } from './software/software.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { LocationModule } from './locations/location.module.js';
import { TicketModule } from './tickets/ticket.module.js';
import { UsersModule } from './users/users.module.js';
import { entities } from './database/entities.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AcademicModule,
    AuthModule,
    InventoryModule,
    LocationModule,
    SoftwareModule,
    TicketModule,
    UsersModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const synchronize = config.get<string>('DB_SYNCHRONIZE', 'false') === 'true';

        if (process.env.NODE_ENV === 'production' && synchronize) {
          throw new Error('DB_SYNCHRONIZE no puede estar activo en producción');
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get<string>('DB_PORT', '5432')),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', ''),
          database: config.get<string>('DB_DATABASE', 'backend'),
          entities,
          migrations: [join(dirname(fileURLToPath(import.meta.url)), 'database/migrations/*.js')],
          migrationsTableName: 'migrations',
          migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
          autoLoadEntities: true,
          synchronize,
        };
      },
    }),
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}

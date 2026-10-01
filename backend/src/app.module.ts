import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AcademicModule } from './academics/academic.module.js';
import { Asignatura } from './academics/asignatura.entity.js';
import { AsignaturaNivel } from './academics/asignatura-nivel.entity.js';
import { NivelEducativo } from './academics/nivel-educativo.entity.js';
import { SoftwareAsignatura } from './software/software-asignatura.entity.js';
import { SoftwareEducativo } from './software/software-educativo.entity.js';
import { SoftwareModule } from './software/software.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { LocationModule } from './locations/location.module.js';
import { TicketModule } from './tickets/ticket.module.js';
import { Device } from './inventory/device.entity.js';
import { Ubicacion } from './locations/ubicacion.entity.js';
import { Ticket } from './tickets/ticket.entity.js';
import { TicketSequence } from './tickets/ticket-sequence.entity.js';
import { User } from './users/user.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AcademicModule,
    AuthModule,
    InventoryModule,
    LocationModule,
    SoftwareModule,
    TicketModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'backend'),
        entities: [User, Device, Ubicacion, Ticket, TicketSequence, NivelEducativo, Asignatura, AsignaturaNivel, SoftwareEducativo, SoftwareAsignatura],
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

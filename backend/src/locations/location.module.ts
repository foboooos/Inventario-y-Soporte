import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Device } from '../inventory/device.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { LocationController } from './location.controller.js';
import { LocationService } from './location.service.js';
import { Ubicacion } from './ubicacion.entity.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Ubicacion, Device, Ticket])],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}

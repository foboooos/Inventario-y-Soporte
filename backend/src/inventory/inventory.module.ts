import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Ubicacion } from '../locations/ubicacion.entity.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { Device } from './device.entity.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Device, Ubicacion, Ticket])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}

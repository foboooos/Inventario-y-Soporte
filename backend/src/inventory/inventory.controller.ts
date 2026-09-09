import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/user-role.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { InventoryService } from './inventory.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  findAll() {
    return this.inventoryService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.inventoryService.create(createDeviceDto);
  }
}

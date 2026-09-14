import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/user-role.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { InventoryService } from './inventory.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

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
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.inventoryService.create(createDeviceDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.inventoryService.update(id, updateDeviceDto);
  }
}

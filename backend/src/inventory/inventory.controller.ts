import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/user-role.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { InventoryService } from './inventory.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { NextDeviceCodeDto } from './dto/next-device-code.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('options')
  @Roles(UserRole.ADMIN, UserRole.TECNICO, UserRole.DOCENTE)
  findOptions() {
    return this.inventoryService.findOptions();
  }

  @Get('next-code')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  async nextCode(@Query() query: NextDeviceCodeDto) {
    return { codigo: await this.inventoryService.nextCode(query.tipo, query.ubicacion) };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
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

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.remove(id);
  }
}

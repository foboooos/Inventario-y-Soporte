import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateSoftwareDto } from './dto/create-software.dto.js';
import { UpdateSoftwareDto } from './dto/update-software.dto.js';
import { SoftwareService } from './software.service.js';

@Controller('software')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECNICO, UserRole.DOCENTE)
  findAll() {
    return this.softwareService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createSoftwareDto: CreateSoftwareDto) {
    return this.softwareService.create(createSoftwareDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSoftwareDto: UpdateSoftwareDto) {
    return this.softwareService.update(id, updateSoftwareDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.softwareService.remove(id);
  }
}

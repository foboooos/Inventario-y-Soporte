import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateLevelDto } from './dto/create-level.dto.js';
import { UpdateLevelDto } from './dto/update-level.dto.js';
import { LevelService } from './level.service.js';

@Controller('levels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECNICO, UserRole.DOCENTE)
  findAll() {
    return this.levelService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createLevelDto: CreateLevelDto) {
    return this.levelService.create(createLevelDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  rename(@Param('id', ParseIntPipe) id: number, @Body() updateLevelDto: UpdateLevelDto) {
    return this.levelService.rename(id, updateLevelDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.levelService.remove(id);
  }
}

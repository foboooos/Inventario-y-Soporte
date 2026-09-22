import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { TicketService } from './ticket.service.js';

type AuthenticatedRequest = Request & { user: { sub: string; rol: string } };

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('inbox')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  findInbox() {
    return this.ticketService.findInbox();
  }

  @Get()
  @Roles(UserRole.DOCENTE)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.ticketService.findAll(request.user.sub);
  }

  @Delete(':id_ticket')
  @Roles(UserRole.DOCENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id_ticket', ParseIntPipe) idTicket: number, @Req() request: AuthenticatedRequest) {
    await this.ticketService.remove(idTicket, request.user.sub);
  }

  @Post()
  @Roles(UserRole.DOCENTE)
  create(@Body() createTicketDto: CreateTicketDto, @Req() request: AuthenticatedRequest) {
    return this.ticketService.create(createTicketDto, request.user.sub);
  }
}

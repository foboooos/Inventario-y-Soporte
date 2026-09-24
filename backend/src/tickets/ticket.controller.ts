import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
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

  @Get(':id_ticket/bitacora')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  findBitacora(@Param('id_ticket', ParseIntPipe) idTicket: number) {
    return this.ticketService.findBitacora(idTicket);
  }

  @Get()
  @Roles(UserRole.DOCENTE)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.ticketService.findAll(request.user.sub);
  }

  @Patch(':id_ticket')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  resolve(@Param('id_ticket', ParseIntPipe) idTicket: number, @Body() resolveTicketDto: ResolveTicketDto, @Req() request: AuthenticatedRequest) {
    return this.ticketService.resolve(idTicket, resolveTicketDto, request.user.sub);
  }

  @Patch(':id_ticket/status')
  @Roles(UserRole.ADMIN, UserRole.TECNICO)
  changeStatus(@Param('id_ticket', ParseIntPipe) idTicket: number, @Body() updateTicketStatusDto: UpdateTicketStatusDto) {
    return this.ticketService.changeStatus(idTicket, updateTicketStatusDto.estado);
  }

  @Post()
  @Roles(UserRole.DOCENTE)
  create(@Body() createTicketDto: CreateTicketDto, @Req() request: AuthenticatedRequest) {
    return this.ticketService.create(createTicketDto, request.user.sub);
  }
}

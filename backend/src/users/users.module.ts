import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Ticket } from '../tickets/ticket.entity.js';
import { User } from './user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, Ticket])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

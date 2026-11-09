import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { normalizeRut } from './rut.js';
import { User } from './user.entity.js';
import { UserRole } from './user-role.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
  ) {}

  findAll() {
    return this.users
      .createQueryBuilder('user')
      .select(['user.rut', 'user.login_id', 'user.nombre', 'user.email', 'user.rol'])
      .addSelect('user.fecha_nacimiento_hash')
      .orderBy('user.nombre', 'ASC')
      .getMany()
      .then((users) => users.map((user) => ({
        rut: user.rut,
        login_id: user.login_id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        fecha_nacimiento_configurada: Boolean(user.fecha_nacimiento_hash),
      })));
  }

  async remove(inputRut: string, actingRut: string) {
    const rut = normalizeRut(inputRut.trim());
    return this.users.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const tickets = manager.getRepository(Ticket);
      const user = await users.findOne({ where: { rut }, lock: { mode: 'pessimistic_write' } });

      if (!user) {
        throw new NotFoundException('El usuario no existe');
      }

      if (rut === normalizeRut(actingRut.trim())) {
        throw new ConflictException('No puedes eliminar tu propio usuario');
      }

      if (user.rol === UserRole.ADMIN) {
        const adminCount = await users.count({ where: { rol: UserRole.ADMIN } });

        if (adminCount <= 1) {
          throw new ConflictException('No puedes eliminar al último administrador');
        }
      }

      const ticketCount = await tickets.count({ where: { id_solicitante: rut } });

      if (ticketCount > 0) {
        throw new ConflictException(
          `No puedes eliminar el usuario: tiene ${ticketCount} ticket(s) asociados`,
        );
      }

      await users.delete({ rut });
    });
  }

  async update(inputRut: string, dto: UpdateUserDto, actingRut?: string) {
    const rut = normalizeRut(inputRut.trim());
    const user = await this.users.findOneBy({ rut });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    if (
      actingRut !== undefined
      && normalizeRut(actingRut.trim()) === rut
      && dto.rol !== undefined
      && dto.rol !== user.rol
    ) {
      throw new ConflictException('No puedes modificar tu propio rol');
    }

    const email = dto.email?.trim().toLowerCase();

    if (email !== undefined && email !== user.email) {
      const duplicateEmail = await this.users.findOneBy({ email });

      if (duplicateEmail) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    if (user.rol === UserRole.ADMIN && dto.rol !== undefined && dto.rol !== UserRole.ADMIN) {
      const adminCount = await this.users.count({ where: { rol: UserRole.ADMIN } });

      if (adminCount <= 1) {
        throw new ConflictException('No puedes quitar el rol al último administrador');
      }
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre.trim();
    if (email !== undefined) user.email = email;
    if (dto.rol !== undefined) user.rol = dto.rol;

    const updates: Partial<User> = { nombre: user.nombre, email: user.email, rol: user.rol };
    if (dto.fecha_nacimiento !== undefined) {
      updates.fecha_nacimiento_hash = await bcrypt.hash(formatBirthDatePassword(dto.fecha_nacimiento), 12);
    }

    await this.users.update({ rut }, updates);

    return {
      rut: user.rut,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };
  }

  async create(dto: CreateUserDto) {
    const rut = normalizeRut(dto.rut.trim());
    const email = dto.email.trim().toLowerCase();

    if (await this.users.findOne({ where: { rut } })) {
      throw new ConflictException('Ya existe un usuario con ese RUT');
    }

    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const [password_hash, fecha_nacimiento_hash] = await Promise.all([
      bcrypt.hash(rut.replace(/\./g, ''), 12),
      bcrypt.hash(formatBirthDatePassword(dto.fecha_nacimiento), 12),
    ]);
    const saved = await this.users.save(
      this.users.create({
        rut,
        nombre: dto.nombre.trim(),
        email,
        password_hash,
        fecha_nacimiento_hash,
        rol: dto.rol,
      }),
    );

    return {
      rut: saved.rut,
      login_id: saved.login_id,
      nombre: saved.nombre,
      email: saved.email,
      rol: saved.rol,
      fecha_nacimiento_configurada: true,
    };
  }
}

function formatBirthDatePassword(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}${month}${year}`;
}

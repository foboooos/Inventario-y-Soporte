import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { normalizeRut } from './rut.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findAll() {
    return this.users.find({
      select: { rut: true, nombre: true, email: true, rol: true },
      order: { nombre: 'ASC' },
    });
  }

  async remove(rut: string) {
    const user = await this.users.findOneBy({ rut });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    await this.users.delete({ rut });
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

    const password_hash = await bcrypt.hash(rut.replace(/\./g, ''), 12);
    const saved = await this.users.save(
      this.users.create({
        rut,
        nombre: dto.nombre.trim(),
        email,
        password_hash,
        rol: dto.rol,
      }),
    );

    return {
      rut: saved.rut,
      nombre: saved.nombre,
      email: saved.email,
      rol: saved.rol,
    };
  }
}

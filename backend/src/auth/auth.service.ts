import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto.js';
import { User } from '../users/user.entity.js';
import { normalizeRut } from '../users/rut.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login({ usuario, password, remember }: LoginDto) {
    const normalizedUsuario = usuario.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where("LOWER(SPLIT_PART(user.email, '@', 1)) = :usuario", { usuario: normalizedUsuario })
      .getOne();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const payload = { sub: user.rut, email: user.email, rol: user.rol };
    const access_token = remember
      ? await this.jwt.signAsync(payload, { expiresIn: '7d' })
      : await this.jwt.signAsync(payload);

    return {
      access_token,
      user: {
        rut: user.rut,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    };
  }

  async me(rut: string) {
    const normalizedRut = normalizeRut(rut.trim());
    const user = await this.users.findOneBy({ rut: normalizedRut });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return {
      rut: user.rut,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };
  }
}

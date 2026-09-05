import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto.js';
import { User } from '../users/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload = { sub: user.id_usuario, email: user.email, rol: user.rol };
    const access_token = await this.jwt.signAsync(payload);

    return {
      access_token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    };
  }
}

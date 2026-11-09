import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity.js';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  rol: string;
};

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    let payload: AuthenticatedUser;
    try {
      payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Token de autenticación inválido');
    }

    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string' || !payload.sub.trim()) {
      throw new UnauthorizedException('Token de autenticación inválido');
    }

    const user = await this.users.findOneBy({ rut: payload.sub });
    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    request.user = { sub: user.rut, email: user.email, rol: user.rol };
    return true;
  }
}

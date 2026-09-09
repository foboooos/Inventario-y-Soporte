import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    try {
      request.user = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token de autenticación inválido');
    }
  }
}

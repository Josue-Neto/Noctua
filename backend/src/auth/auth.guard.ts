import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import type { AuthRequestUser, AuthenticatedRequest, UserRole } from './auth.types';

export function cookieValue(header: string | undefined, name: string) {
  if (!header) return undefined;
  const item = header.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    let payload: { sub?: string; sid?: string };
    try {
      const token = cookieValue((request as Request).headers.cookie, 'noctua_session');
      if (!token) throw new UnauthorizedException('Entre para continuar.');
      payload = await this.jwt.verifyAsync<{ sub?: string; sid?: string }>(token);
      if (!payload.sub || !payload.sid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid)) throw new Error('Invalid session');
    } catch { throw new UnauthorizedException('Sua sessão expirou. Entre novamente.'); }
    try {
      const rows = await this.dataSource.query(
        'SELECT u.id, u.email, u.role FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>NOW()',
        [payload.sub, payload.sid],
      ) as Array<{ id: string; email: string; role: UserRole }>;
      if (!rows[0]) throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
      const user: AuthRequestUser = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException('Serviço temporariamente indisponível.');
    }
  }
}

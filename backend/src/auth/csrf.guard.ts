import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    const origin = request.headers.origin;

    const expectedOrigin = new URL(
      process.env.FRONTEND_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173',
    ).origin;
    if (
      (origin && origin !== expectedOrigin) ||
      request.headers['x-noctua-request'] !== '1'
    ) {
      throw new ForbiddenException('Origem da requisição não permitida.');
    }
    return true;
  }
}

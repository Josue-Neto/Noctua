import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthSecurityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthSecurityService.name);
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}

  private limit(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key) ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${key}`);
    return value;
  }

  async consume(kind: 'login' | 'reset', ip: string, email: string): Promise<number> {
    const login = kind === 'login';
    const windowSeconds = this.limit(login ? 'AUTH_LOGIN_WINDOW_SECONDS' : 'AUTH_RESET_WINDOW_SECONDS', login ? 900 : 3600);
    const limits = [this.limit(login ? 'AUTH_LOGIN_IP_LIMIT' : 'AUTH_RESET_IP_LIMIT', login ? 100 : 30), this.limit(login ? 'AUTH_LOGIN_PAIR_LIMIT' : 'AUTH_RESET_PAIR_LIMIT', login ? 5 : 3)];
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
    const keys = [hash(`${kind}:ip:${ip}`), hash(`${kind}:pair:${JSON.stringify([ip, email.trim().toLowerCase()])}`)];
    try {
      return await this.db.transaction(async manager => {
        let retry = 0;
        for (let i = 0; i < keys.length; i++) {
          const [row] = await manager.query(`INSERT INTO auth_rate_limits (key_hash,attempts,expires_at)
            VALUES ($1,1,NOW()+($2 * INTERVAL '1 second'))
            ON CONFLICT (key_hash) DO UPDATE SET
              attempts=CASE WHEN auth_rate_limits.expires_at<=NOW() THEN 1 ELSE LEAST(auth_rate_limits.attempts+1,$3+1) END,
              expires_at=CASE WHEN auth_rate_limits.expires_at<=NOW() THEN NOW()+($2 * INTERVAL '1 second') ELSE auth_rate_limits.expires_at END
            RETURNING attempts,GREATEST(1,CEIL(EXTRACT(EPOCH FROM (expires_at-NOW()))))::integer AS retry`, [keys[i], windowSeconds, limits[i]]);
          if (row.attempts > limits[i]) retry = Math.max(retry, row.retry);
        }
        return retry;
      });
    } catch (error) {
      this.logger.error('Falha ao verificar limite de acesso.', error);
      throw new ServiceUnavailableException('Serviço temporariamente indisponível.');
    }
  }

  onModuleInit() {
    this.timer = setInterval(() => { void this.cleanup(); }, 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async cleanup() {
    try {
      await this.db.query('DELETE FROM auth_rate_limits WHERE expires_at < NOW()');
      await this.db.query('DELETE FROM auth_sessions WHERE expires_at < NOW()');
    } catch (error) { this.logger.error('Falha ao limpar dados de autenticação expirados.', error); }
  }
}

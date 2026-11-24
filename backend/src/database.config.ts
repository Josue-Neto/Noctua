import { readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const rawUrl = config.get<string>('DATABASE_URL');
  const caFile = config.get<string>('DB_SSL_CA_FILE');
  let url: string | undefined;
  if (rawUrl) {
    const parsed = new URL(rawUrl);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
      parsed.searchParams.delete(key);
    url = parsed.toString();
  }
  return {
    type: 'postgres',
    ...(url
      ? { url }
      : {
          host: config.getOrThrow<string>('DB_HOST'),
          port: Number(config.get('DB_PORT', '5432')),
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
        }),
    ssl: url
      ? {
          rejectUnauthorized: true,
          ...(caFile ? { ca: readFileSync(caFile, 'utf8') } : {}),
        }
      : false,
    schema: 'noctua',
    extra: {
      max: 5,
      options: '-c search_path=noctua,pg_catalog',
      connectionTimeoutMillis: 10000,
    },
    autoLoadEntities: true,
    synchronize: false,
  };
}

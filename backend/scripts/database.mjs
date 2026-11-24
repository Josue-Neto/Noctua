import 'dotenv/config'
import { readFileSync } from 'node:fs'

export function databaseConfig(env = process.env) {
  const remote = Boolean(env.DATABASE_URL)
  const ssl = remote
    ? {
        rejectUnauthorized: true,
        ...(env.DB_SSL_CA_FILE
          ? { ca: readFileSync(env.DB_SSL_CA_FILE, 'utf8') }
          : {}),
      }
    : false
  if (remote) {
    const url = new URL(env.DATABASE_URL)
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
      url.searchParams.delete(key)
    return {
      connectionString: url.toString(),
      ssl,
      options: '-c search_path=noctua,pg_catalog',
      connectionTimeoutMillis: 10000,
    }
  }
  return {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl,
    options: '-c search_path=noctua,pg_catalog',
    connectionTimeoutMillis: 10000,
  }
}

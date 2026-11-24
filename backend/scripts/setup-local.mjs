import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
const root = new URL('../../.local-test/', import.meta.url)
const adminPassword = (
  await readFile(new URL('postgres-password', root), 'utf8')
).trim()
const admin = new pg.Client({
  host: '127.0.0.1',
  port: 55432,
  user: 'noctua_test',
  password: adminPassword,
  database: 'postgres',
})
await admin.connect()
try {
  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname='noctua'",
  )
  if (exists.rowCount)
    throw new Error(
      'A base noctua já existe. A configuração não será sobrescrita.',
    )
  const password = randomBytes(32).toString('hex')
  await admin.query(`CREATE ROLE noctua_local LOGIN PASSWORD '${password}'`)
  await admin.query('CREATE DATABASE noctua OWNER noctua_local')
  const app = new pg.Client({
    host: '127.0.0.1',
    port: 55432,
    user: 'noctua_local',
    password,
    database: 'noctua',
  })
  await app.connect()
  await app.query('CREATE SCHEMA noctua AUTHORIZATION noctua_local')
  await app.query('REVOKE ALL ON SCHEMA noctua FROM PUBLIC')
  await app.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public')
  await app.end()
  const previous = await readFile(new URL('../.env', import.meta.url), 'utf8')
  await writeFile(new URL('supabase.env', root), previous)
  const env = `NODE_ENV=development\nPORT=3000\nFRONTEND_URL=http://localhost:5173\nDB_HOST=127.0.0.1\nDB_PORT=55432\nDB_USER=noctua_local\nDB_PASSWORD=${password}\nDB_NAME=noctua\nJWT_SECRET=${randomBytes(48).toString('hex')}\nJWT_EXPIRES_IN=1h\nSCHOOL_TIMEZONE=America/Sao_Paulo\nSCHOOL_NAME=Noctua\n`
  await writeFile(new URL('../.env', import.meta.url), env)
  console.log(
    'Banco local noctua configurado. Credenciais do Supabase guardadas em .local-test/supabase.env (ignorado pelo Git).',
  )
} finally {
  await admin.end()
}
